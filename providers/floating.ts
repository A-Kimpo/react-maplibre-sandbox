// src/lib/floatingContainer.ts
export type Rect = { left: number; top: number; width: number; height: number };

export function createFloatingContainer(
    initial: Rect = { left: 220, top: 40, width: 900, height: 600 }
) {
    const container = document.createElement("div");

    container.id = "floating-map-root";

    Object.assign(container.style, {
        position: "fixed",
        left: `${initial.left}px`,
        top: `${initial.top}px`,
        width: `${initial.width}px`,
        height: `${initial.height}px`,
        zIndex: String(100000),
        boxShadow: "0 10px 30px rgba(2,6,23,0.4)",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        touchAction: "none", // important for pointer events
    });

    //* Header (drag handle + controls)
    const header = document.createElement("div");

    Object.assign(header.style, {
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px",
        background: "rgba(0,0,0,0.6)",
        color: "#fff",
        cursor: "grab",
        userSelect: "none",
        flex: "0 0 36px",
    });

    header.innerHTML = `<div style="font-size:13px; font-weight:600;">Map</div><div style="display:flex;gap:8px;align-items:center"><button data-float-close style="background:#ef4444;border:none;padding:6px;border-radius:6px;color:#fff;cursor:pointer">Close</button></div>`;

    container.appendChild(header);

    //* Map body
    const body = document.createElement("div");

    body.id = "floating-map-body";

    Object.assign(body.style, {
        flex: "1 1 auto",
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#eee",
    });

    container.appendChild(body);

    //* Resize handle (bottom-right)
    const resizeHandle = document.createElement("div");

    Object.assign(resizeHandle.style, {
        position: "absolute",
        width: "14px",
        height: "14px",
        right: "4px",
        bottom: "4px",
        cursor: "nwse-resize",
        zIndex: "100001",
        background: "transparent",
    });

    body.appendChild(resizeHandle);

    document.body.appendChild(container);

    // * Drag logic
    let dragging: null | {
        pointerId: number;
        startX: number;
        startY: number;
        origLeft: number;
        origTop: number;
    } = null;

    function onHeaderPointerDown(e: PointerEvent) {
        //* start drag
        (e.target as Element).setPointerCapture?.(e.pointerId);

        dragging = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            origLeft: parseFloat(container.style.left || "0"),
            origTop: parseFloat(container.style.top || "0"),
        };

        header.style.cursor = "grabbing";
        window.addEventListener("pointermove", onHeaderPointerMove);
        window.addEventListener("pointerup", onHeaderPointerUp, { once: true });
    }

    function onHeaderPointerMove(e: PointerEvent) {
        if (!dragging || e.pointerId !== dragging.pointerId) return;

        const dx = e.clientX - dragging.startX;
        const dy = e.clientY - dragging.startY;

        container.style.left = `${Math.max(0, dragging.origLeft + dx)}px`;
        container.style.top = `${Math.max(0, dragging.origTop + dy)}px`;
    }

    function onHeaderPointerUp(e: PointerEvent) {
        if (!dragging) return;

        header.style.cursor = "grab";

        window.removeEventListener("pointermove", onHeaderPointerMove);

        dragging = null;
    }
    header.addEventListener("pointerdown", onHeaderPointerDown);

    // * Resize logic
    let resizing: null | {
        pointerId: number;
        startX: number;
        startY: number;
        origW: number;
        origH: number;
    } = null;

    function onResizePointerDown(e: PointerEvent) {
        e.preventDefault();

        (e.target as Element).setPointerCapture?.(e.pointerId);

        resizing = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            origW: parseFloat(container.style.width || "0"),
            origH: parseFloat(container.style.height || "0"),
        };

        window.addEventListener("pointermove", onResizePointerMove);
        window.addEventListener("pointerup", onResizePointerUp, { once: true });
    }
    function onResizePointerMove(e: PointerEvent) {
        if (!resizing || e.pointerId !== resizing.pointerId) return;

        const dx = e.clientX - resizing.startX;
        const dy = e.clientY - resizing.startY;
        const newW = Math.max(200, resizing.origW + dx);
        const newH = Math.max(120, resizing.origH + dy);

        container.style.width = `${newW}px`;
        container.style.height = `${newH}px`;
    }
    function onResizePointerUp(e: PointerEvent) {
        if (!resizing) return;

        window.removeEventListener("pointermove", onResizePointerMove);

        const ev = new CustomEvent("floating-map-resized");

        window.dispatchEvent(ev);

        resizing = null;
    }
    resizeHandle.addEventListener("pointerdown", onResizePointerDown);

    //* Close button
    const closeBtn = container.querySelector(
        "[data-float-close]"
    ) as HTMLButtonElement | null;
    closeBtn?.addEventListener("click", () => {
        const ev = new CustomEvent("floating-map-close");

        // * dispatch event for container owner
        window.dispatchEvent(ev);
    });

    //* Expose API
    return {
        container,
        body,
        header,
        destroy() {
            // * cleanup listeners
            header.removeEventListener("pointerdown", onHeaderPointerDown);

            resizeHandle.removeEventListener(
                "pointerdown",
                onResizePointerDown
            );

            closeBtn?.removeEventListener("click", () => {});

            try {
                document.body.removeChild(container);
            } catch (e) {
                console.log("ERROR!", e);
            }
        },
        getRect(): Rect {
            return {
                left: parseFloat(container.style.left || "0"),
                top: parseFloat(container.style.top || "0"),
                width: parseFloat(container.style.width || "0"),
                height: parseFloat(container.style.height || "0"),
            };
        },
    };
}
