'use client';

export default function ReportsSection({ title, subtitle, children, className = "" }) {
    return (
        <div className={`bg-white rounded-xl shadow-lg ${className}`}>
            <div className="px-6 py-4 border-b border-gray-200 rounded-t-xl" 
                 style={{ background: 'linear-gradient(90deg, #355E3B 0%, #2d4f32 100%)' }}>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                {subtitle && (
                    <p className="text-sm" style={{ color: '#FFD700' }}>{subtitle}</p>
                )}
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    );
}