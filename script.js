
/* Echoes Beyond Earth: Interactive comet hero */

(() => {

    const hero = document.getElementById("hero");
    const canvas = document.getElementById("sky");
    const hint = document.querySelector(".comet-hint");

    if (!hero || !canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const ICE = "143, 211, 255";
    const TAU = Math.PI * 2;

    let W = 0;
    let H = 0;
    let dpr = 1;

    let stars = [];
    let particles = [];
    let trail = [];
    let meteors = [];
    let queue = [];

    let nextAmbient = 0.6;
    let nextShower = 2.2;

    let running = false;
    let lastT = 0;
    let visible = true;

    const orbit = {
        cx: 0,
        cy: 0,
        a: 0,
        b: 0,
        rot: -0.5,
        sunX: 0,
        sunY: 0
    };

    const comet = {
        theta: 0.9,
        omega: 0.2,
        x: 0,
        y: 0,
        dragging: false,
        touched: false,
        hover: 0
    };

    const mouse = {
        x: -9999,
        y: -9999,
        px: 0,
        py: 0,
        tx: 0,
        ty: 0
    };


    /* ---------- Geometry ---------- */

    function orbitPoint(theta) {

        const lx = orbit.a * Math.cos(theta);
        const ly = orbit.b * Math.sin(theta);

        const c = Math.cos(orbit.rot);
        const s = Math.sin(orbit.rot);

        return {
            x: orbit.cx + lx * c - ly * s,
            y: orbit.cy + lx * s + ly * c
        };
    }


    function thetaFromPoint(x, y) {

        const dx = x - orbit.cx;
        const dy = y - orbit.cy;

        const c = Math.cos(-orbit.rot);
        const s = Math.sin(-orbit.rot);

        const lx = dx * c - dy * s;
        const ly = dx * s + dy * c;

        return Math.atan2(
            ly / orbit.b,
            lx / orbit.a
        );
    }


    function speedAt(theta) {

        return 0.2 * (
            0.55 + 0.9 * (1 + Math.cos(theta)) / 2
        );
    }


    const wrap = angle =>
        Math.atan2(Math.sin(angle), Math.cos(angle));


    /* ---------- Meteors ---------- */

    const METEOR_DIR = 2.55;


    function spawnMeteor(fireball) {

        const angle =
            METEOR_DIR + (Math.random() - 0.5) * 0.22;

        const big = fireball || Math.random() < 0.12;

        meteors.push({

            x: W * (0.25 + Math.random()),
            y: -60 - Math.random() * H * 0.35,

            dx: Math.cos(angle),
            dy: Math.sin(angle),

            v: (big ? 900 : 650) + Math.random() * 700,

            len: big
                ? 220 + Math.random() * 140
                : 80 + Math.random() * 130,

            w: big
                ? 2.6
                : 0.9 + Math.random() * 1.1,

            age: 0

        });
    }


    function spawnShower(count) {

        for (let i = 0; i < count; i++) {

            queue.push({

                delay: i * (0.05 + Math.random() * 0.14),

                fireball: i === 0 && count > 8

            });
        }
    }


    /* ---------- Setup ---------- */

    function resize() {

        const rect = hero.getBoundingClientRect();

        dpr = Math.min(window.devicePixelRatio || 1, 2);

        W = rect.width;
        H = rect.height;

        if (!W || !H) return;

        canvas.width = W * dpr;
        canvas.height = H * dpr;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const narrow = W < 700;

        orbit.cx = narrow ? W * 0.5 : W * 0.66;
        orbit.cy = narrow ? H * 0.34 : H * 0.5;

        orbit.a = narrow
            ? W * 0.72
            : Math.min(W * 0.48, 780);

        orbit.b = narrow
            ? W * 0.26
            : Math.min(H * 0.3, 260);

        orbit.rot = narrow ? -0.85 : -0.5;

        const sun = {
            x: orbit.a * 0.5,
            y: 0
        };

        const c = Math.cos(orbit.rot);
        const s = Math.sin(orbit.rot);

        orbit.sunX =
            orbit.cx + sun.x * c - sun.y * s;

        orbit.sunY =
            orbit.cy + sun.x * s + sun.y * c;


        const count = Math.round((W * H) / 5200);

        stars = Array.from({ length: count }, () => ({

            x: Math.random() * W,
            y: Math.random() * H,

            r: Math.random() * 1.1 + 0.25,

            depth: Math.random() * 0.8 + 0.2,

            phase: Math.random() * Math.PI * 2,

            speed: Math.random() * 0.8 + 0.3

        }));


        const p = orbitPoint(comet.theta);

        comet.x = p.x;
        comet.y = p.y;

        if (!running) {
            draw(0);
        }
    }


    /* ---------- Simulation ---------- */

    function update(dt, t) {

        if (!comet.dragging) {

            comet.omega +=
                (speedAt(comet.theta) - comet.omega) *
                Math.min(1, dt * 1.2);

            comet.theta += comet.omega * dt;
        }


        const p = orbitPoint(comet.theta);

        const vx = (p.x - comet.x) / Math.max(dt, 0.001);
        const vy = (p.y - comet.y) / Math.max(dt, 0.001);

        comet.x = p.x;
        comet.y = p.y;


        trail.unshift({ x: p.x, y: p.y });

        if (trail.length > 70) {
            trail.pop();
        }


        const near =
            Math.hypot(
                mouse.x - comet.x,
                mouse.y - comet.y
            ) < 46;

        comet.hover +=
            ((near || comet.dragging ? 1 : 0) - comet.hover) *
            Math.min(1, dt * 8);

        hero.classList.toggle(
            "is-near",
            near && !comet.dragging
        );


        /* Tail particles */

        let ax = comet.x - orbit.sunX;
        let ay = comet.y - orbit.sunY;

        const al = Math.hypot(ax, ay) || 1;

        ax /= al;
        ay /= al;

        const emit =
            Math.min(6, Math.round(180 * dt)) +
            (comet.dragging ? 1 : 0);

        for (let i = 0; i < emit && particles.length < 420; i++) {

            const spread = (Math.random() - 0.5) * 0.9;
            const sp = 25 + Math.random() * 70;

            const cs = Math.cos(spread);
            const sn = Math.sin(spread);

            particles.push({

                x: comet.x + (Math.random() - 0.5) * 4,
                y: comet.y + (Math.random() - 0.5) * 4,

                vx: (ax * cs - ay * sn) * sp + vx * 0.06,
                vy: (ax * sn + ay * cs) * sp + vy * 0.06,

                life: 1,
                decay: 0.45 + Math.random() * 0.7,

                r: Math.random() * 1.6 + 0.4

            });
        }


        for (let i = particles.length - 1; i >= 0; i--) {

            const q = particles[i];

            const dx = q.x - mouse.x;
            const dy = q.y - mouse.y;

            const d2 = dx * dx + dy * dy;

            if (d2 < 7000 && d2 > 1) {

                const d = Math.sqrt(d2);
                const f = (1 - d / 84) * 380 * dt;

                q.vx += (dx / d) * f;
                q.vy += (dy / d) * f;
            }

            q.x += q.vx * dt;
            q.y += q.vy * dt;

            q.vx *= 1 - dt * 0.8;
            q.vy *= 1 - dt * 0.8;

            q.life -= q.decay * dt;

            if (q.life <= 0) {
                particles.splice(i, 1);
            }
        }


        /* Meteors */

        nextAmbient -= dt;

        if (nextAmbient <= 0) {

            spawnMeteor(false);

            nextAmbient = 0.25 + Math.random() * 0.9;
        }


        nextShower -= dt;

        if (nextShower <= 0) {

            spawnShower(10 + Math.floor(Math.random() * 8));

            nextShower = 12 + Math.random() * 8;
        }


        for (let i = queue.length - 1; i >= 0; i--) {

            queue[i].delay -= dt;

            if (queue[i].delay <= 0) {

                spawnMeteor(queue[i].fireball);

                queue.splice(i, 1);
            }
        }


        for (let i = meteors.length - 1; i >= 0; i--) {

            const m = meteors[i];

            m.x += m.dx * m.v * dt;
            m.y += m.dy * m.v * dt;

            m.age += dt;

            if (m.x < -400 || m.y > H + 400) {
                meteors.splice(i, 1);
            }
        }


        mouse.px +=
            (mouse.tx - mouse.px) * Math.min(1, dt * 3);

        mouse.py +=
            (mouse.ty - mouse.py) * Math.min(1, dt * 3);


        /* Drag hint */

        if (hint) {

            const hx = Math.min(
                Math.max(comet.x + 22, 8),
                Math.max(8, W - 290)
            );

            const hy = Math.min(
                Math.max(comet.y + 20, 8),
                Math.max(8, H - 40)
            );

            hint.style.transform = `translate(${hx}px, ${hy}px)`;

            hint.classList.toggle(
                "is-visible",
                !comet.touched && t > 1.6
            );
        }
    }


    /* ---------- Drawing ---------- */

    function draw(t) {

        if (!W || !H) return;

        ctx.clearRect(0, 0, W, H);


        /* Stars */

        for (const s of stars) {

            const tw =
                0.55 + 0.45 * Math.sin(t * s.speed + s.phase);

            const x = s.x + mouse.px * 14 * s.depth;
            const y = s.y + mouse.py * 14 * s.depth;

            ctx.globalAlpha =
                (0.25 + 0.6 * s.depth) *
                (reduceMotion ? 1 : tw);

            ctx.fillStyle = "#e9e4d8";

            ctx.beginPath();
            ctx.arc(x, y, s.r, 0, TAU);
            ctx.fill();
        }


        /* Orbit */

        ctx.globalAlpha = 1;

        ctx.strokeStyle =
            `rgba(${ICE}, ${0.07 + comet.hover * 0.13})`;

        ctx.lineWidth = 1;

        ctx.setLineDash([2, 7]);

        ctx.beginPath();

        ctx.ellipse(
            orbit.cx,
            orbit.cy,
            orbit.a,
            orbit.b,
            orbit.rot,
            0,
            TAU
        );

        ctx.stroke();

        ctx.setLineDash([]);


        ctx.globalCompositeOperation = "lighter";


        /* Meteors */

        ctx.lineCap = "round";

        for (const m of meteors) {

            const a = Math.min(1, m.age * 5);

            const tx = m.x - m.dx * m.len;
            const ty = m.y - m.dy * m.len;

            const lg = ctx.createLinearGradient(
                m.x, m.y, tx, ty
            );

            lg.addColorStop(0, `rgba(255,255,255,${a})`);
            lg.addColorStop(0.25, `rgba(${ICE},${a * 0.5})`);
            lg.addColorStop(1, `rgba(${ICE},0)`);

            ctx.globalAlpha = 1;
            ctx.strokeStyle = lg;
            ctx.lineWidth = m.w;

            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();

            ctx.fillStyle = `rgba(255,255,255,${a})`;

            ctx.beginPath();
            ctx.arc(m.x, m.y, m.w * 0.8, 0, TAU);
            ctx.fill();
        }


        /* Tail particles */

        for (const q of particles) {

            ctx.globalAlpha = Math.max(0, q.life) * 0.7;

            ctx.fillStyle = `rgb(${ICE})`;

            ctx.beginPath();
            ctx.arc(
                q.x,
                q.y,
                q.r * (0.5 + q.life * 0.5),
                0,
                TAU
            );

            ctx.fill();
        }


        /* Comet trail */

        ctx.lineCap = "round";

        for (let i = 1; i < trail.length; i++) {

            const k = 1 - i / trail.length;

            ctx.globalAlpha = k * 0.55;
            ctx.strokeStyle = `rgb(${ICE})`;
            ctx.lineWidth = 0.5 + k * 3.2;

            ctx.beginPath();

            ctx.moveTo(
                trail[i - 1].x,
                trail[i - 1].y
            );

            ctx.lineTo(
                trail[i].x,
                trail[i].y
            );

            ctx.stroke();
        }


        /* Comet head */

        const glow = 26 + comet.hover * 22;

        const g = ctx.createRadialGradient(
            comet.x,
            comet.y,
            0,
            comet.x,
            comet.y,
            glow
        );

        g.addColorStop(0, "rgba(255,255,255,0.95)");
        g.addColorStop(0.18, `rgba(${ICE},0.55)`);
        g.addColorStop(1, `rgba(${ICE},0)`);

        ctx.globalAlpha = 1;
        ctx.fillStyle = g;

        ctx.beginPath();
        ctx.arc(comet.x, comet.y, glow, 0, TAU);
        ctx.fill();

        ctx.fillStyle = "#fff";

        ctx.beginPath();
        ctx.arc(
            comet.x,
            comet.y,
            3 + comet.hover * 0.8,
            0,
            TAU
        );

        ctx.fill();


        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
    }


    /* ---------- Animation ---------- */

    function frame(now) {

        if (!running) return;

        const t = now / 1000;

        const dt = Math.min(t - lastT, 0.05) || 0.016;

        lastT = t;

        update(dt, t);
        draw(t);

        requestAnimationFrame(frame);
    }


    function start() {

        if (reduceMotion || running || !visible) return;

        running = true;

        lastT = performance.now() / 1000;

        requestAnimationFrame(frame);
    }


    function stop() {

        running = false;
        lastT = 0;
    }


    /* ---------- Input ---------- */

    function local(e) {

        const r = hero.getBoundingClientRect();

        return {

            x: e.clientX - r.left,
            y: e.clientY - r.top,

            w: r.width,
            h: r.height

        };
    }


    let lastMoveT = 0;


    hero.addEventListener("pointermove", e => {

        const p = local(e);

        mouse.x = p.x;
        mouse.y = p.y;

        mouse.tx = p.x / p.w - 0.5;
        mouse.ty = p.y / p.h - 0.5;


        if (comet.dragging) {

            const now = performance.now() / 1000;

            const dtm = Math.max(
                now - lastMoveT,
                0.008
            );

            lastMoveT = now;

            const target = thetaFromPoint(p.x, p.y);

            const delta = wrap(target - comet.theta);

            comet.omega +=
                (delta / dtm - comet.omega) * 0.35;

            comet.theta += delta;
        }

    });


    hero.addEventListener("pointerleave", () => {

        if (comet.dragging) return;

        mouse.x = -9999;
        mouse.y = -9999;

        mouse.tx = 0;
        mouse.ty = 0;
    });


    hero.addEventListener("pointerdown", e => {

        const p = local(e);

        if (e.target.closest("a, button")) return;

        const distance = Math.hypot(
            p.x - comet.x,
            p.y - comet.y
        );

        if (distance > (e.pointerType === "touch" ? 60 : 46)) {

            if (!reduceMotion) {
                spawnShower(12);
                comet.touched = true;
            }

            return;
        }


        e.preventDefault();

        comet.dragging = true;
        comet.touched = true;

        lastMoveT = performance.now() / 1000;

        hero.setPointerCapture(e.pointerId);

        hero.classList.add("is-grabbing");

    });


    function release(e) {

        if (!comet.dragging) return;

        comet.dragging = false;

        comet.omega = Math.max(
            -3,
            Math.min(3, comet.omega)
        );

        hero.classList.remove("is-grabbing");

        if (
            e.pointerId !== undefined &&
            hero.hasPointerCapture(e.pointerId)
        ) {
            hero.releasePointerCapture(e.pointerId);
        }
    }


    hero.addEventListener("pointerup", release);
    hero.addEventListener("pointercancel", release);


    /* ---------- Lifecycle ---------- */

    new ResizeObserver(resize).observe(hero);


    new IntersectionObserver(([entry]) => {

        visible = entry.isIntersecting;

        if (visible) {
            start();
        } else {
            stop();
        }

    }, { threshold: 0 }).observe(hero);


    document.addEventListener("visibilitychange", () => {

        if (document.hidden) {
            stop();
        } else {
            start();
        }

    });


    /* ---------- Initialisation ---------- */

    resize();

    if (reduceMotion) {

        running = false;
        draw(0);

    } else {

        start();

    }

})();
