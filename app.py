import logging
import win32clipboard
import win32con
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

def generate_rtf_for_field(field_data):
    """
    Recursively generates RTF content for a given field definition.
    field_data: dict with keys 'type', 'name' (for simple), 'condition', 'true_part', 'false_part' (for if)
    """
    field_type = field_data.get('type')
    
    if field_type == 'simple':
        name = field_data.get('name', 'FIELD')
        return r'{\field{\*\fldinst { MERGEFIELD "' + name + r'" }}{\fldrslt }}'
    
    elif field_type == 'text':
        # Simple text node
        return field_data.get('value', '')

    elif field_type == 'if':
        condition_field_name = field_data.get('condition_field')
        condition_operator = field_data.get('condition_operator', '=')
        condition_value = field_data.get('condition_value', '')
        
        # Recursively generate content for true/false parts
        true_part_data = field_data.get('true_content')
        false_part_data = field_data.get('false_content')
        
        true_rtf = generate_rtf_for_field(true_part_data) if true_part_data else ''
        false_rtf = generate_rtf_for_field(false_part_data) if false_part_data else ''
        
        condition_rtf = r'{\field{\*\fldinst { MERGEFIELD "' + condition_field_name + r'" }}{\fldrslt }} ' + f'{condition_operator} "{condition_value}"'
        
        # Note: We wrap the result parts in quotes if they are simple text, but if they are fields, 
        # Word handles them better if they are just there. 
        # However, standard IF syntax often expects quotes around the result strings.
        # If the result is a field, it should be fine inside quotes too: "{ MERGEFIELD X }"
        
        rtf = r'{\field{\*\fldinst { IF ' + condition_rtf + r' "' + true_rtf + r'" "' + false_rtf + r'" }}{\fldrslt }}'
        return rtf

    elif field_type == 'check_empty':
        # Logic: IF { MERGEFIELD Main } = "" "{ MERGEFIELD Fallback }" "{ MERGEFIELD Main }"
        main_field = field_data.get('main_field', 'Main')
        
        # Fallback can now be nested
        fallback_data = field_data.get('fallback_content')
        if fallback_data:
            fallback_rtf = generate_rtf_for_field(fallback_data)
        else:
            # Legacy/Simple fallback (though we will migrate to nested structure in JS)
            fallback_simple = field_data.get('fallback_field', 'Fallback')
            fallback_rtf = r'{\field{\*\fldinst { MERGEFIELD "' + fallback_simple + r'" }}{\fldrslt }}'
        
        main_rtf = r'{\field{\*\fldinst { MERGEFIELD "' + main_field + r'" }}{\fldrslt }}'
        
        # Condition: Main = ""
        condition = main_rtf + r' = ""'
        
        rtf = r'{\field{\*\fldinst { IF ' + condition + r' "' + fallback_rtf + r'" "' + main_rtf + r'" }}{\fldrslt }}'
        return rtf
        
    return ''

def copy_to_clipboard(rtf_content):
    """
    Writes RTF content to the Windows Clipboard.
    """
    try:
        win32clipboard.OpenClipboard()
        win32clipboard.EmptyClipboard()
        
        # Register CF_RTF
        cf_rtf = win32clipboard.RegisterClipboardFormat("Rich Text Format")
        
        # RTF Header/Footer wrapper is needed for a valid RTF stream
        full_rtf = r'{\rtf1\ansi\ansicpg1252\deff0\nouicompat\deflang1033{\fonttbl{\f0\fnil\fcharset0 Calibri;}}' + \
                   r'{\*\generator Riched20 10.0.19041}\viewkind4\uc1 ' + \
                   r'\pard\sa200\sl276\slmult1\f0\fs22\lang9 ' + \
                   rtf_content + \
                   r'\par}'
        
        # Encode to bytes
        rtf_bytes = full_rtf.encode('cp1252') # Standard Windows encoding
        
        win32clipboard.SetClipboardData(cf_rtf, rtf_bytes)
        
    except Exception as e:
        logging.error(f"Clipboard error: {e}")
        raise e
    finally:
        win32clipboard.CloseClipboard()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/copy_field', methods=['POST'])
def copy_field():
    try:
        data = request.json
        logging.info(f"Received data: {data}")
        
        rtf_output = generate_rtf_for_field(data)
        logging.info(f"Generated RTF: {rtf_output}")
        
        copy_to_clipboard(rtf_output)
        
        return jsonify({"status": "success", "message": "Copied to clipboard!"})
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
