// 存储所有多边形数据
const polygons = [];

// 预定义颜色数组
const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33',
    '#33FFF5', '#FF8C33', '#8C33FF', '#33FF8C', '#FF3333'
];

let currentColorIndex = 0;

// 画布变换参数
let canvasOffset = { x: 0, y: 0 };
let canvasScale = 1;
let isDragging = false;
let lastMousePos = { x: 0, y: 0 };

// 用于生成向量字符串
function pointToVectorString(point) {
    return `X=${point.x.toFixed(3)} Y=${point.y.toFixed(3)} Z=0.000`;
}

// 获取DOM元素
const canvas = document.getElementById('polygonCanvas');
const ctx = canvas.getContext('2d');
const vectorInput = document.getElementById('vectorInput');
const addPolygonBtn = document.getElementById('addPolygon');
const clearAllBtn = document.getElementById('clearAll');
const polygonListItems = document.getElementById('polygonListItems');
const inputPanelHeader = document.getElementById('inputPanelHeader');
const polygonListHeader = document.getElementById('polygonListHeader');
const inputPanel = inputPanelHeader.parentElement;
const polygonListPanel = polygonListHeader.parentElement;

// 设置画布大小
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    drawAllPolygons();
}

// 解析向量字符串
function parseVector(vectorStr) {
    const xMatch = vectorStr.match(/X=([0-9.-]+)/);
    const yMatch = vectorStr.match(/Y=([0-9.-]+)/);

    if (xMatch && yMatch) {
        return {
            x: parseFloat(xMatch[1]),
            y: parseFloat(yMatch[1])
        };
    }
    return null;
}

// 解析向量数组
function parseVectorArray(jsonStr) {
    try {
        const vectorArray = JSON.parse(jsonStr);
        const points = [];

        for (const vectorStr of vectorArray) {
            const point = parseVector(vectorStr);
            if (point) {
                points.push(point);
            }
        }

        return points;
    } catch (error) {
        console.error('解析错误:', error);
        alert('输入格式错误，请检查JSON格式是否正确！');
        return null;
    }
}

// 计算所有点的边界
function calculateBounds(allPoints) {
    if (allPoints.length === 0) return null;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const point of allPoints) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }

    return { minX, maxX, minY, maxY };
}

// 转换坐标到画布坐标系（加入缩放和平移）
function transformPoint(point, bounds, padding = 50) {
    const width = canvas.width;
    const height = canvas.height;

    const dataWidth = bounds.maxX - bounds.minX;
    const dataHeight = bounds.maxY - bounds.minY;

    const scale = Math.min(
        (width - padding * 2) / dataWidth,
        (height - padding * 2) / dataHeight
    ) * canvasScale;

    // 转换坐标（Y轴翻转，因为画布Y轴向下）
    const x = padding + (point.x - bounds.minX) * scale + canvasOffset.x;
    const y = height - padding - (point.y - bounds.minY) * scale + canvasOffset.y;

    return { x, y };
}

// 绘制单个多边形
function drawPolygon(points, color, bounds) {
    if (points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.fillStyle = color + '33'; // 添加透明度
    ctx.lineWidth = 2;

    ctx.beginPath();

    const firstPoint = transformPoint(points[0], bounds);
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < points.length; i++) {
        const p = transformPoint(points[i], bounds);
        ctx.lineTo(p.x, p.y);
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 绘制顶点
    ctx.fillStyle = color;
    for (const point of points) {
        const p = transformPoint(point, bounds);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 绘制所有多边形
function drawAllPolygons() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (polygons.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('右键拖动画布 | 滚轮缩放 | 点击底部添加多边形', canvas.width / 2, canvas.height / 2);
        return;
    }

    // 收集所有点以计算统一的边界
    const allPoints = [];
    for (const polygon of polygons) {
        allPoints.push(...polygon.points);
    }

    const bounds = calculateBounds(allPoints);

    // 绘制所有多边形
    for (const polygon of polygons) {
        drawPolygon(polygon.points, polygon.color, bounds);
    }
}

// 更新多边形列表显示
function updatePolygonList() {
    polygonListItems.innerHTML = '';

    polygons.forEach((polygon, index) => {
        const li = document.createElement('li');
        li.className = 'polygon-item';

        // 创建多边形标题头部
        const header = document.createElement('div');
        header.className = 'polygon-header';
        header.innerHTML = `
            <span class="toggle-icon">▶</span>
            <span class="color-box" style="background-color: ${polygon.color}"></span>
            <span class="polygon-title">多边形 ${index + 1} (${polygon.points.length} 个顶点)</span>
            <button class="delete-btn" data-index="${index}">删除</button>
        `;

        // 创建详情内容区域
        const details = document.createElement('div');
        details.className = 'polygon-details';

        // 创建向量数据编辑区
        const vectorList = document.createElement('div');
        vectorList.className = 'vector-list';

        polygon.vectorArray.forEach((vector, vIndex) => {
            const vectorItem = document.createElement('div');
            vectorItem.className = 'vector-item';
            vectorItem.innerHTML = `
                <span class="vector-label">顶点 ${vIndex + 1}:</span>
                <input type="text"
                       class="vector-input"
                       value="${vector}"
                       data-polygon-index="${index}"
                       data-vector-index="${vIndex}">
            `;
            vectorList.appendChild(vectorItem);
        });

        details.appendChild(vectorList);

        // 组装列表项
        li.appendChild(header);
        li.appendChild(details);
        polygonListItems.appendChild(li);

        // 添加展开/收起事件
        header.addEventListener('click', (e) => {
            // 如果点击的是删除按钮，不触发展开/收起
            if (e.target.classList.contains('delete-btn')) {
                return;
            }

            const icon = header.querySelector('.toggle-icon');
            const isExpanded = details.classList.contains('expanded');

            if (isExpanded) {
                details.classList.remove('expanded');
                icon.textContent = '▶';
            } else {
                details.classList.add('expanded');
                icon.textContent = '▼';
            }
        });
    });

    // 添加删除按钮事件
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发展开/收起
            const index = parseInt(e.target.getAttribute('data-index'));
            polygons.splice(index, 1);
            updatePolygonList();
            drawAllPolygons();
        });
    });

    // 添加向量输入框的实时更新事件
    document.querySelectorAll('.vector-input').forEach(input => {
        input.addEventListener('blur', updateVectorData);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                updateVectorData(e);
            }
        });
    });
}

// 更新向量数据并重新绘制
function updateVectorData(e) {
    const input = e.target;
    const polygonIndex = parseInt(input.getAttribute('data-polygon-index'));
    const vectorIndex = parseInt(input.getAttribute('data-vector-index'));
    const newVectorStr = input.value.trim();

    try {
        // 验证新的向量格式
        const point = parseVector(newVectorStr);
        if (!point) {
            alert('向量格式错误！请使用格式: X=数值 Y=数值 Z=数值');
            input.value = polygons[polygonIndex].vectorArray[vectorIndex];
            return;
        }

        // 更新数据
        polygons[polygonIndex].vectorArray[vectorIndex] = newVectorStr;
        polygons[polygonIndex].points[vectorIndex] = point;

        // 重新绘制
        drawAllPolygons();

        // 提示成功
        input.style.backgroundColor = '#d4edda';
        setTimeout(() => {
            input.style.backgroundColor = '';
        }, 500);

    } catch (error) {
        alert('向量格式错误！');
        input.value = polygons[polygonIndex].vectorArray[vectorIndex];
    }
}

// 添加多边形
function addPolygon() {
    const inputValue = vectorInput.value.trim();

    if (!inputValue) {
        alert('请输入向量数组！');
        return;
    }

    const points = parseVectorArray(inputValue);

    if (points && points.length > 0) {
        const color = colors[currentColorIndex % colors.length];
        currentColorIndex++;

        // 保存原始向量数组
        polygons.push({
            points,
            color,
            vectorArray: JSON.parse(inputValue)  // 保存原始向量字符串数组
        });

        updatePolygonList();
        drawAllPolygons();

        vectorInput.value = '';
        alert(`成功添加多边形！共 ${points.length} 个顶点`);
    }
}

// 清除所有多边形
function clearAll() {
    if (polygons.length > 0 && confirm('确定要清除所有多边形吗？')) {
        polygons.length = 0;
        currentColorIndex = 0;
        canvasOffset = { x: 0, y: 0 };
        canvasScale = 1;
        updateBackgroundPosition();
        updatePolygonList();
        drawAllPolygons();
    }
}

// 画布鼠标事件 - 右键拖动
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // 右键
        isDragging = true;
        lastMousePos = { x: e.clientX, y: e.clientY };
        canvas.classList.add('dragging');
        e.preventDefault();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;

        canvasOffset.x += dx;
        canvasOffset.y += dy;

        lastMousePos = { x: e.clientX, y: e.clientY };

        // 更新背景网格位置
        updateBackgroundPosition();

        drawAllPolygons();
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 2) {
        isDragging = false;
        canvas.classList.remove('dragging');
    }
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.classList.remove('dragging');
});

// 禁用右键菜单
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// 更新背景网格位置和大小
function updateBackgroundPosition() {
    const bgX = canvasOffset.x % (20 * canvasScale);
    const bgY = canvasOffset.y % (20 * canvasScale);
    const bgSize = 20 * canvasScale;

    canvas.style.backgroundPosition = `${bgX}px ${bgY}px`;
    canvas.style.backgroundSize = `${bgSize}px ${bgSize}px`;
}

// 画布滚轮缩放
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = canvasScale * delta;

    // 限制缩放范围
    if (newScale >= 0.1 && newScale <= 10) {
        canvasScale = newScale;
        updateBackgroundPosition(); // 更新背景网格缩放
        drawAllPolygons();
    }
}, { passive: false });

// 面板折叠功能
inputPanelHeader.addEventListener('click', () => {
    inputPanel.classList.toggle('collapsed');
});

polygonListHeader.addEventListener('click', () => {
    polygonListPanel.classList.toggle('collapsed');
});

// 事件监听
addPolygonBtn.addEventListener('click', addPolygon);
clearAllBtn.addEventListener('click', clearAll);
window.addEventListener('resize', resizeCanvas);

// 支持Enter键添加
vectorInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        addPolygon();
    }
});

// 初始化
resizeCanvas();
updateBackgroundPosition();
