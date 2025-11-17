export function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + " ";
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}

export const Graphics = {
    square: (ctx, x, y, size, color = "#fff") => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
    },
    circle: (ctx, x, y, radius, color = "#fff") => {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    },
};
