document.addEventListener('DOMContentLoaded', () => {
    const draggables = document.querySelectorAll('.draggable-item');
    const dropZone = document.getElementById('drop-zone');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn'); // Bottom clear button (optional, can keep or remove)
    const clearHeaderBtn = document.getElementById('clear-header-btn'); // New header button
    const statusMsg = document.getElementById('status-msg');

    // Import Elements
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const fieldList = document.getElementById('field-list');

    // Root of our logic tree
    let rootField = null;
    window.rootField = null; // Expose for debugging

    function updateRootField(newData) {
        rootField = newData;
        window.rootField = newData;
    }

    // --- Import Logic ---
    importBtn.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const fields = text.split(/\r?\n/).filter(line => line.trim() !== '');

            // Populate Datalist
            fieldList.innerHTML = '';
            fields.forEach(field => {
                const option = document.createElement('option');
                option.value = field.trim();
                fieldList.appendChild(option);
            });

            showStatus(`Imported ${fields.length} fields.`, 'success');
        };
        reader.onerror = () => {
            showStatus('Error reading file.', 'error');
        };
        reader.readAsText(file);

        // Reset input so same file can be selected again
        importFile.value = '';
    });

    // --- Drag & Drop Setup ---
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('type', draggable.dataset.type);
            e.dataTransfer.setData('source', 'toolbox');
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    // Initialize the main drop zone
    setupDropZone(dropZone, (type) => {
        console.log('Drop detected:', type);
        if (rootField && !confirm('Replace current field?')) return;
        updateRootField(createFieldData(type));
        renderWorkspace();
    });

    // --- Data Structure Helpers ---
    function createFieldData(type) {
        if (type === 'simple') {
            return { type: 'simple', name: '' };
        } else if (type === 'if') {
            return {
                type: 'if',
                condition_field: '',
                condition_operator: '=',
                condition_value: '',
                true_content: { type: 'text', value: '' }, // Default to text
                false_content: { type: 'text', value: '' } // Default to text
            };
        } else if (type === 'check_empty') {
            return {
                type: 'check_empty',
                main_field: '',
                fallback_content: { type: 'text', value: '' }
            };
        } else if (type === 'text') {
            return { type: 'text', value: '' };
        }
        return null;
    }

    // --- Rendering Logic ---
    function renderWorkspace() {
        dropZone.innerHTML = '';

        if (!rootField) {
            dropZone.innerHTML = '<p class="placeholder">Drag a field here to start</p>';
            dropZone.classList.add('drop-zone');
            return;
        }

        dropZone.classList.remove('drop-zone');

        dropZone.classList.remove('drop-zone');

        // Show header clear button
        if (clearHeaderBtn) clearHeaderBtn.style.display = 'inline-block';

        // Render the root
        dropZone.appendChild(renderField(rootField, (newData) => {
            updateRootField(newData);
        }));
    }

    function renderField(fieldData, updateCallback) {
        const container = document.createElement('div');
        container.className = 'config-item';

        if (fieldData.type === 'simple') {
            container.innerHTML = `
                <h3>📄 Simple Merge Field</h3>
                <div class="form-group">
                    <label>Field Name</label>
                    <input type="text" value="${fieldData.name}" list="field-list" autocomplete="off" placeholder="e.g. FirstName">
                </div>
            `;
            const input = container.querySelector('input');
            input.oninput = (e) => fieldData.name = e.target.value;

        } else if (fieldData.type === 'check_empty') {
            container.innerHTML = `
                <h3>❓ Check Empty</h3>
                <div class="form-group">
                    <label>Main Field (to check)</label>
                    <input type="text" class="main-f" value="${fieldData.main_field}" list="field-list" autocomplete="off" placeholder="e.g. MobilePhone">
                </div>
                <div class="nested-zones">
                    <div class="zone-fallback" style="margin-top:10px; padding:10px; border:1px dashed #ccc; border-radius:5px;">
                        <label style="font-weight:bold; color:#d97706;">Fallback Content (if empty):</label>
                        <div class="content-area"></div>
                    </div>
                </div>
                <small style="color: #666; display:block; margin-top:10px;">Logic: IF Main="" THEN Fallback ELSE Main</small>
            `;
            container.querySelector('.main-f').oninput = (e) => fieldData.main_field = e.target.value;

            // Render Nested Fallback Zone
            const fallbackArea = container.querySelector('.zone-fallback .content-area');
            renderNestedContent(fallbackArea, fieldData.fallback_content, (newContent) => {
                fieldData.fallback_content = newContent;
                fallbackArea.innerHTML = '';
                renderNestedContent(fallbackArea, fieldData.fallback_content, (n) => fieldData.fallback_content = n);
            });

        } else if (fieldData.type === 'if') {
            container.innerHTML = `
                <h3>🔀 IF Condition</h3>
                <div class="form-group">
                    <label>If Field</label>
                    <input type="text" class="cond-f" value="${fieldData.condition_field}" list="field-list" autocomplete="off" placeholder="e.g. Gender">
                </div>
                <div class="form-group" style="display:flex; gap:10px;">
                    <div style="flex:1">
                        <label>Operator</label>
                        <select class="cond-op">
                            <option value="=" ${fieldData.condition_operator === '=' ? 'selected' : ''}>=</option>
                            <option value="<>" ${fieldData.condition_operator === '<>' ? 'selected' : ''}><></option>
                            <option value=">" ${fieldData.condition_operator === '>' ? 'selected' : ''}>></option>
                            <option value="<" ${fieldData.condition_operator === '<' ? 'selected' : ''}><</option>
                        </select>
                    </div>
                    <div style="flex:1">
                        <label>Value</label>
                        <input type="text" class="cond-v" value="${fieldData.condition_value}" placeholder="e.g. M">
                    </div>
                </div>
                
                <div class="nested-zones">
                    <div class="zone-true" style="margin-top:10px; padding:10px; border:1px dashed #ccc; border-radius:5px;">
                        <label style="font-weight:bold; color:green;">True Content:</label>
                        <div class="content-area"></div>
                    </div>
                    <div class="zone-false" style="margin-top:10px; padding:10px; border:1px dashed #ccc; border-radius:5px;">
                        <label style="font-weight:bold; color:red;">False Content:</label>
                        <div class="content-area"></div>
                    </div>
                </div>
            `;

            // Bind Inputs
            container.querySelector('.cond-f').oninput = (e) => fieldData.condition_field = e.target.value;
            container.querySelector('.cond-op').onchange = (e) => fieldData.condition_operator = e.target.value;
            container.querySelector('.cond-v').oninput = (e) => fieldData.condition_value = e.target.value;

            // Render Nested Zones
            const trueArea = container.querySelector('.zone-true .content-area');
            const falseArea = container.querySelector('.zone-false .content-area');

            renderNestedContent(trueArea, fieldData.true_content, (newContent) => {
                fieldData.true_content = newContent;
                trueArea.innerHTML = '';
                renderNestedContent(trueArea, fieldData.true_content, (n) => fieldData.true_content = n);
            });

            renderNestedContent(falseArea, fieldData.false_content, (newContent) => {
                fieldData.false_content = newContent;
                falseArea.innerHTML = '';
                renderNestedContent(falseArea, fieldData.false_content, (n) => fieldData.false_content = n);
            });
        } else if (fieldData.type === 'text') {
            container.innerHTML = `
                <div class="form-group" style="margin-bottom:0">
                    <input type="text" value="${fieldData.value}" placeholder="Enter text...">
                </div>
            `;
            container.querySelector('input').oninput = (e) => fieldData.value = e.target.value;
            container.style.border = 'none';
            container.style.padding = '0';
            container.style.boxShadow = 'none';
            container.style.background = 'transparent';
        }

        return container;
    }

    function renderNestedContent(container, contentData, updateParentCallback) {
        const wrapper = document.createElement('div');

        if (contentData.type === 'text') {
            // Render text input
            const textEl = renderField(contentData);
            wrapper.appendChild(textEl);

            // Make it a drop zone to upgrade to a field
            setupDropZone(wrapper, (type) => {
                const newField = createFieldData(type);
                updateParentCallback(newField);
            });

            wrapper.style.position = 'relative';
        } else {
            // Render the complex field
            const fieldEl = renderField(contentData, (newData) => {
                // Recursive updates handled by object ref
            });

            // Add "Remove / Revert to Text" button
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '×';
            removeBtn.style.float = 'right';
            removeBtn.style.color = 'red';
            removeBtn.style.border = 'none';
            removeBtn.style.background = 'none';
            removeBtn.style.cursor = 'pointer';
            removeBtn.onclick = () => {
                updateParentCallback({ type: 'text', value: '' });
            };

            wrapper.appendChild(removeBtn);
            wrapper.appendChild(fieldEl);
        }

        container.appendChild(wrapper);
    }

    function setupDropZone(element, onDrop) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.style.background = '#eef2ff';
        });

        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.style.background = '';
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.style.background = '';
            const type = e.dataTransfer.getData('type');
            if (type) onDrop(type);
        });
    }

    function clearWorkspace() {
        updateRootField(null);
        renderWorkspace();
        statusMsg.textContent = '';
        if (clearHeaderBtn) clearHeaderBtn.style.display = 'none';
    }

    if (clearBtn) clearBtn.addEventListener('click', clearWorkspace);
    if (clearHeaderBtn) clearHeaderBtn.addEventListener('click', clearWorkspace);

    copyBtn.addEventListener('click', async () => {
        if (!rootField) {
            showStatus('Please drag a field to the workspace first.', 'error');
            return;
        }

        try {
            showStatus('Copying...', '');
            const response = await fetch('/copy_field', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rootField)
            });

            const result = await response.json();

            if (response.ok) {
                showStatus(result.message, 'success');
            } else {
                showStatus('Error: ' + result.message, 'error');
            }
        } catch (err) {
            console.error(err);
            showStatus('Network Error: Could not connect to server. Is app.py running?', 'error');
        }
    });

    // --- Toggle View Logic ---
    const viewToggle = document.getElementById('view-toggle-checkbox');
    const treeView = document.getElementById('tree-view');
    const resetViewBtn = document.getElementById('reset-view-btn');

    viewToggle.addEventListener('change', () => {
        if (viewToggle.checked) {
            // Switch to Tree View
            dropZone.style.display = 'none';
            treeView.style.display = 'block';
            if (resetViewBtn) resetViewBtn.style.display = 'inline-block';
            renderTreeView();
        } else {
            // Switch to Form View
            dropZone.style.display = 'flex';
            if (rootField) dropZone.classList.remove('drop-zone');
            treeView.style.display = 'none';
            if (resetViewBtn) resetViewBtn.style.display = 'none';
            renderWorkspace();
        }
    });

    // D3 Zoom Behavior
    let zoomBehavior = null;
    let svgSelection = null;

    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', () => {
            if (svgSelection && zoomBehavior) {
                svgSelection.transition().duration(750).call(zoomBehavior.transform, d3.zoomIdentity.translate(50, 50).scale(1));
            }
        });
    }

    function renderTreeView() {
        console.log('Rendering Tree View. RootField:', rootField);
        treeView.innerHTML = '';
        if (!rootField) {
            treeView.innerHTML = '<p class="placeholder">No field to visualize</p>';
            return;
        }

        const width = treeView.clientWidth || 800;
        const height = treeView.clientHeight || 500;

        // Create SVG
        const svg = d3.select('#tree-view')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [0, 0, width, height]);

        svgSelection = svg;

        const g = svg.append('g');

        // Setup Zoom
        zoomBehavior = d3.zoom()
            .scaleExtent([0.1, 5])
            .on('zoom', (e) => {
                g.attr('transform', e.transform);
            });

        svg.call(zoomBehavior)
            .call(zoomBehavior.transform, d3.zoomIdentity.translate(50, 50).scale(1));

        // Convert Data
        const hierarchyData = convertToHierarchy(rootField);
        const root = d3.hierarchy(hierarchyData);

        // Layout
        const treeLayout = d3.tree().nodeSize([180, 100]); // Width, Height spacing
        treeLayout(root);

        // Links
        const linkGroup = g.append('g').attr('class', 'links');

        const links = linkGroup.selectAll('.link')
            .data(root.links())
            .enter()
            .append('g');

        links.append('path')
            .attr('class', 'link')
            .attr('d', d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y));

        // Link Labels (True/False)
        links.filter(d => d.target.data.branchType)
            .append('g')
            .attr('transform', d => {
                const x = (d.source.x + d.target.x) / 2;
                const y = (d.source.y + d.target.y) / 2;
                return `translate(${x},${y})`;
            })
            .each(function (d) {
                const group = d3.select(this);
                const labelText = d.target.data.branchType === 'true' ? 'True' :
                    d.target.data.branchType === 'false' ? 'False' :
                        d.target.data.branchType === 'fallback' ? 'Empty' : '';

                const colorClass = d.target.data.branchType === 'true' ? 'label-true' :
                    d.target.data.branchType === 'false' ? 'label-false' : 'label-fallback';

                group.append('rect')
                    .attr('class', 'link-label-rect')
                    .attr('width', 40)
                    .attr('height', 16)
                    .attr('x', -20)
                    .attr('y', -8);

                group.append('text')
                    .attr('class', `link-label-text ${colorClass}`)
                    .text(labelText);
            });

        // Nodes
        const nodes = g.append('g')
            .selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // Node Rect
        nodes.append('rect')
            .attr('width', 140)
            .attr('height', 60)
            .attr('x', -70)
            .attr('y', -30);

        // Node Icon
        nodes.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .text(d => d.data.icon);

        // Node Title
        nodes.append('text')
            .attr('class', 'title')
            .attr('x', 0)
            .attr('y', 10)
            .attr('text-anchor', 'middle')
            .text(d => d.data.title);

        // Node Detail
        nodes.append('text')
            .attr('class', 'detail')
            .attr('x', 0)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .text(d => truncate(d.data.detail, 20));
    }

    function convertToHierarchy(field, branchType = null) {
        let node = {
            branchType: branchType,
            children: []
        };

        if (field.type === 'simple') {
            node.icon = '📄';
            node.title = 'Simple Field';
            node.detail = field.name || '(unnamed)';
        } else if (field.type === 'if') {
            node.icon = '🔀';
            node.title = 'IF Condition';
            node.detail = `${field.condition_field} ${field.condition_operator} ${field.condition_value}`;

            if (field.true_content) {
                node.children.push(convertToHierarchy(field.true_content, 'true'));
            }
            if (field.false_content) {
                node.children.push(convertToHierarchy(field.false_content, 'false'));
            }
        } else if (field.type === 'check_empty') {
            node.icon = '❓';
            node.title = 'Check Empty';
            node.detail = `If ${field.main_field} is empty`;

            if (field.fallback_content) {
                node.children.push(convertToHierarchy(field.fallback_content, 'fallback'));
            }
        } else if (field.type === 'text') {
            node.icon = '📝';
            node.title = 'Text';
            node.detail = field.value ? `"${field.value}"` : '(empty)';
        }

        return node;
    }

    function truncate(str, n) {
        return (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;
    }

    function showStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className = 'status ' + type;
        if (type === 'success') {
            setTimeout(() => {
                statusMsg.textContent = '';
                statusMsg.className = 'status';
            }, 3000);
        }
    }
});
