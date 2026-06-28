import { drawDiscNodeLabel } from 'sigma/rendering';
import type { NodeHoverDrawingFunction } from 'sigma/rendering';

/** Sigma default hover uses #FFF; light node labels are unreadable. Dark panel + light text. */
const HOVER_BG = '#1e293b';
const HOVER_BORDER = '#64748b';
const HOVER_LABEL = '#f8fafc';

export const drawDarkDiscNodeHover: NodeHoverDrawingFunction = (context, data, settings) => {
	const size = settings.labelSize;
	const font = settings.labelFont;
	const weight = settings.labelWeight;
	context.font = `${weight} ${size}px ${font}`;

	context.fillStyle = HOVER_BG;
	context.shadowOffsetX = 0;
	context.shadowOffsetY = 0;
	context.shadowBlur = 12;
	context.shadowColor = 'rgba(0,0,0,0.55)';

	const PADDING = 2;
	if (typeof data.label === 'string') {
		const textWidth = context.measureText(data.label).width;
		const boxWidth = Math.round(textWidth + 5);
		const boxHeight = Math.round(size + 2 * PADDING);
		const radius = Math.max(data.size, size / 2) + PADDING;
		const angleRadian = Math.asin(boxHeight / 2 / radius);
		const xDeltaCoord = Math.sqrt(Math.abs(radius ** 2 - (boxHeight / 2) ** 2));
		context.beginPath();
		context.moveTo(data.x + xDeltaCoord, data.y + boxHeight / 2);
		context.lineTo(data.x + radius + boxWidth, data.y + boxHeight / 2);
		context.lineTo(data.x + radius + boxWidth, data.y - boxHeight / 2);
		context.lineTo(data.x + xDeltaCoord, data.y - boxHeight / 2);
		context.arc(data.x, data.y, radius, angleRadian, -angleRadian);
		context.closePath();
		context.fill();
		context.shadowBlur = 0;
		context.strokeStyle = HOVER_BORDER;
		context.lineWidth = 1;
		context.stroke();
	} else {
		context.beginPath();
		context.arc(data.x, data.y, data.size + PADDING, 0, Math.PI * 2);
		context.closePath();
		context.fill();
		context.shadowBlur = 0;
		context.strokeStyle = HOVER_BORDER;
		context.lineWidth = 1;
		context.stroke();
	}
	context.shadowOffsetX = 0;
	context.shadowOffsetY = 0;
	context.shadowBlur = 0;

	drawDiscNodeLabel(context, { ...data, labelColor: HOVER_LABEL }, settings);
};
