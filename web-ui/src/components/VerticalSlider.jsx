import React, { useState, useEffect, useRef } from 'react';

const VerticalSlider = ({ label, subLabel, min = 0, max = 200, value, onChange, unit = "", isMuted = false, onMute = null, displayValue = null, showTicks = true, compact = false, step = 1 }) => {
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    // Position knob based on value
    const getKnobPosition = () => {
        const percent = (value - min) / (max - min);
        // Handle division by zero or NaN
        if (isNaN(percent)) return 0;
        return (1 - Math.max(0, Math.min(percent, 1))) * 100;
    };

    const handleMove = (clientY) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const height = rect.height;
        const y = Math.max(0, Math.min(clientY - rect.top, height));
        const percent = 1 - (y / height);
        const rawValue = min + percent * (max - min);
        const newValue = Math.round(rawValue / step) * step;
        // Fix float precision (e.g. 0.300000004)
        const precision = (step.toString().split('.')[1] || '').length;
        onChange(Number(newValue.toFixed(precision)));
    };

    useEffect(() => {
        const onMouseMove = (e) => {
            if (isDragging) handleMove(e.clientY);
        };

        const onMouseUp = () => setIsDragging(false);

        const onTouchMove = (e) => {
            if (isDragging) handleMove(e.touches[0].clientY);
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

    const ticks = [max, Math.round((max + min) / 2), min];

    return (
        <div className={`slider-wrapper ${isMuted ? 'muted' : ''} ${compact ? 'compact' : ''}`}>
            <div className="slider-label">{label}</div>
            <div className="slider-value">
                {isMuted ? 'MUTE' : (displayValue !== null ? `${displayValue}${unit}` : `${value}${unit}`)}
            </div>

            <div className="slider-visual-area" ref={containerRef}
                onMouseDown={(e) => { setIsDragging(true); handleMove(e.clientY); }}
                onTouchStart={(e) => { setIsDragging(true); handleMove(e.touches[0].clientY); }}>
                <div className="slider-track">
                    <div className="slider-fill" style={{ height: `${100 - getKnobPosition()}%` }}></div>
                </div>
                {showTicks && !compact && (
                    <div className="slider-ticks">
                        {ticks.map((t, i) => (
                            <div key={i} className="tick" style={{ top: `${(1 - (t - min) / (max - min)) * 100}%` }}>
                                <span className="tick-label">{t}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="slider-knob" style={{ top: `${getKnobPosition()}%` }}></div>
            </div>

            {subLabel && <div className="slider-sublabel">{subLabel}</div>}

            {onMute && (
                <button className={`mute-button ${isMuted ? 'active' : ''}`} onClick={onMute}>
                    {isMuted ? '🔇' : '🔊'}
                </button>
            )}
        </div>
    );
};

export default VerticalSlider;
