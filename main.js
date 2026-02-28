// 存储所有多边形数据
const polygons = [];

// 预定义颜色数组
const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33',
    '#33FFF5', '#FF8C33', '#8C33FF', '#33FF8C', '#FF3333'
];

let currentColorIndex = 0;

// 获取DOM元素
const canvas = document.getElementById('polygonCanvas');
const ctx = canvas.getContext('2d');
const vectorInput = document.getElementById('vectorInput');
const addPolygonBtn = document.getElementById('addPolygon');
const clearAllBtn = document.getElementById('clearAll');
const polygonListItems = document.getElementById('polygonListItems');

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

// 转换坐标到画布坐标系
function transformPoint(point, bounds, padding = 50) {
    const width = canvas.width;
    const height = canvas.height;

    const dataWidth = bounds.maxX - bounds.minX;
    const dataHeight = bounds.maxY - bounds.minY;

    const scale = Math.min(
        (width - padding * 2) / dataWidth,
        (height - padding * 2) / dataHeight
    );

    // 转换坐标（Y轴翻转，因为画布Y轴向下）
    const x = padding + (point.x - bounds.minX) * scale;
    const y = height - padding - (point.y - bounds.minY) * scale;

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
        ctx.fillText('请输入向量数组并点击"添加多边形"', canvas.width / 2, canvas.height / 2);
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
        li.innerHTML = `
            <span class="color-box" style="background-color: ${polygon.color}"></span>
            多边形 ${index + 1} (${polygon.points.length} 个顶点)
            <button class="delete-btn" data-index="${index}">删除</button>
        `;
        polygonListItems.appendChild(li);
    });

    // 添加删除按钮事件
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            polygons.splice(index, 1);
            updatePolygonList();
            drawAllPolygons();
        });
    });
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

        polygons.push({ points, color });

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
        updatePolygonList();
        drawAllPolygons();
    }
}

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
