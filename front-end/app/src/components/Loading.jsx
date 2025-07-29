import React from 'react';

export default function Loading({ className = '', size = 40 }) {
    const style = {
        width: size,
        height: size,
        borderWidth: Math.max(2, Math.round(size / 5)),
    };
    return (
        <div className={`flex justify-center items-center ${className}`}>
            <div
                className="animate-spin rounded-full border-slate-300 border-t-blue-500"
                style={style}
            ></div>
        </div>
    );
}