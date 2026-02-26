import React, { useState, useEffect, useRef } from 'react';

const HorizontalSlider = ({ label, min = 0, max = 200, value, onChange, unit = "", step = 1 }) => {
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const getKnobPosition = () => {
        const percent = (value - min) / (max - min);
        if (isNaN(percent)) return 0;
        return Math.max(0, Math.min(percent, 1)) * 100;
    };

    const handleMove = (clientX) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width;
        const x = Math.max(0, Math.min(clientX - rect.left, width));
        const percent = x / width;
        const rawValue = min + percent * (max - min);
        const newValue = Math.round(rawValue / step) * step;
        const precision = (step.toString().split('.')[1] || '').length;
        onChange(Number(newValue.toFixed(precision)));
    };

    useEffect(() => {
        const onMouseMove = (e) => {
            if (isDragging) handleMove(e.clientX);
        };
        const onMouseUp = () => setIsDragging(false);
        const onTouchMove = (e) => {
            if (isDragging) handleMove(e.touches[0].clientX);
        };

        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('touchmove', onTouchMove);
            window.addEventListener('touchend', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onMouseUp);
        };
    }, [isDragging]);

    return (
        <div className="h-slider-wrapper">
            <div className="h-slider-info">
                <span className="h-slider-label">{label}</span>
                <span className="h-slider-value">{value}{unit}</span>
            </div>
            <div className="h-slider-visual-area" ref={containerRef}
                onMouseDown={(e) => { setIsDragging(true); handleMove(e.clientX); }}
                onTouchStart={(e) => { setIsDragging(true); handleMove(e.touches[0].clientX); }}>
                <div className="h-slider-track">
                    <div className="h-slider-fill" style={{ width: `${getKnobPosition()}%` }}></div>
                </div>
                <div className="h-slider-knob" style={{ left: `${getKnobPosition()}%` }}></div>
            </div>
        </div>
    );
};

export default HorizontalSlider;
