'use client';

export default function KPICard({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color = '#355E3B', 
    textColor = '#355E3B',
    iconBgColor = '#355E3B',
    iconColor = '#FFD700',
    borderColor = '#355E3B'
}) {
    return (
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 hover:shadow-xl transition-shadow duration-200" 
             style={{ borderLeftColor: borderColor }}>
            <div className="flex items-center">
                <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center" 
                         style={{ backgroundColor: iconBgColor }}>
                        <svg className="h-6 w-6" style={{ color: iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {icon}
                        </svg>
                    </div>
                </div>
                <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <p className="text-3xl font-bold" style={{ color: textColor }}>
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-sm text-gray-500">{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
}