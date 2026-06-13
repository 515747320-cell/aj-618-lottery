// ==================== 澳洁618抽奖前端逻辑 ====================

document.addEventListener('DOMContentLoaded', function() {
    const formSection = document.getElementById('formSection');
    const prizesSection = document.getElementById('prizesSection');
    const drawSection = document.getElementById('drawSection');
    const submitBtn = document.getElementById('submitInfoBtn');
    const drawBtn = document.getElementById('drawBtn');
    const resultModal = document.getElementById('resultModal');
    const closeModal = document.getElementById('closeModal');
    const prizeLevelBadge = document.getElementById('prizeLevelBadge');
    const prizeName = document.getElementById('prizeName');
    const winnerName = document.getElementById('winnerName');
    const confettiCanvas = document.getElementById('confettiCanvas');
    const ctx = confettiCanvas.getContext('2d');

    let userInfo = null;

    // Canvas尺寸
    function resizeCanvas() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 气泡
    function createBubbles() {
        const container = document.getElementById('bubblesContainer');
        for (let i = 0; i < 15; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            const size = Math.random() * 60 + 20;
            bubble.style.width = size + 'px';
            bubble.style.height = size + 'px';
            bubble.style.left = Math.random() * 100 + '%';
            bubble.style.animationDuration = (Math.random() * 10 + 8) + 's';
            bubble.style.animationDelay = Math.random() * 5 + 's';
            container.appendChild(bubble);
        }
    }
    createBubbles();

    // 礼花粒子
    const particles = [];
    const colors = ['#FFD700', '#FF8C00', '#0AB4C8', '#FFFFFF', '#FF6B00'];

    class Particle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 8 + 4;
            this.speedX = Math.random() * 10 - 5;
            this.speedY = Math.random() * 10 - 5;
            this.gravity = 0.3;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.life = 1;
            this.decay = Math.random() * 0.02 + 0.01;
        }
        update() {
            this.speedY += this.gravity;
            this.x += this.speedX;
            this.y += this.speedY;
            this.life -= this.decay;
        }
        draw() {
            ctx.save();
            ctx.globalAlpha = this.life;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function createConfetti(x, y) {
        for (let i = 0; i < 100; i++) {
            particles.push(new Particle(x, y));
        }
    }

    function animateConfetti() {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
        if (particles.length > 0) requestAnimationFrame(animateConfetti);
    }

    // 提交信息
    submitBtn.addEventListener('click', function() {
        const name = document.getElementById('userName').value.trim();
        const phone = document.getElementById('userPhone').value.trim();

        if (!name) {
            alert('请输入姓名');
            return;
        }
        if (!phone || !/^1\d{10}$/.test(phone)) {
            alert('请输入正确的11位手机号');
            return;
        }

        userInfo = { name, phone };

        // 隐藏表单，显示奖品和抽奖按钮
        formSection.style.display = 'none';
        prizesSection.style.display = 'flex';
        drawSection.style.display = 'block';
    });

    // 回车提交
    document.getElementById('userPhone').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') submitBtn.click();
    });

    // 抽奖
    let isDrawing = false;

    drawBtn.addEventListener('click', async function() {
        if (isDrawing || !userInfo) return;

        isDrawing = true;
        drawBtn.disabled = true;
        drawBtn.classList.add('loading');

        try {
            const response = await fetch('/api/draw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: userInfo.name,
                    phone: userInfo.phone
                })
            });

            const data = await response.json();

            if (data.success) {
                const levelNames = { 1: '一等奖', 2: '二等奖', 3: '三等奖' };
                prizeLevelBadge.textContent = levelNames[data.prize.level];
                prizeName.textContent = data.prize.name;
                winnerName.textContent = userInfo.name;

                resultModal.classList.add('active');

                // 礼花
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                createConfetti(cx, cy);
                animateConfetti();
                setTimeout(() => createConfetti(cx - 100, cy - 50), 200);
                setTimeout(() => createConfetti(cx + 100, cy - 50), 400);
            } else {
                alert('抽奖失败：' + data.message);
            }
        } catch (error) {
            alert('网络错误，请重试');
        } finally {
            isDrawing = false;
            drawBtn.disabled = false;
            drawBtn.classList.remove('loading');
        }
    });

    // 关闭弹窗
    closeModal.addEventListener('click', () => resultModal.classList.remove('active'));
    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) resultModal.classList.remove('active');
    });
});
