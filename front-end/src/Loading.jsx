import React from 'react';

export default function Loading({className = ''}) {
    return (
        <div className={`flex justify-center items-center ${className}`}>
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-300 border-t-blue-500"></div>
        </div>
    );
}