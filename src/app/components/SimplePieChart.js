'use client';

export default function SimplePieChart({ data, title }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No data available for {title}</p>
            </div>
        );
    }

    // Color mapping for designations and vehicle types
    const designationColors = {
        'Student': '#355E3B',
        'Faculty': '#FFD700',
        'Security': '#4E7D57',
        'Admin': '#F79646',
        'Staff': '#4F81BD',
        '2-wheel': '#FFD700',
        '4-wheel': '#355E3B'
    };
    
    const defaultColors = ['#355E3B', '#FFD700', '#4E7D57', '#F79646', '#4F81BD', '#95A5A6'];
    
    const getColor = (label, index) => {
        return designationColors[label] || defaultColors[index % defaultColors.length];
    };
    
    let currentAngle = 0;
    const radius = 100;
    const centerX = 120;
    const centerY = 120;

    return (
        <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 text-center">{title}</h4>
            <div className="flex items-center justify-center">
                <div className="relative">
                    <svg width="240" height="240" viewBox="0 0 240 240">
                        {data.map((item, index) => {
                            const angle = (item.value / total) * 360;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            
                            const startAngleRad = (startAngle * Math.PI) / 180;
                            const endAngleRad = (endAngle * Math.PI) / 180;
                            
                            const startX = centerX + radius * Math.cos(startAngleRad);
                            const startY = centerY + radius * Math.sin(startAngleRad);
                            const endX = centerX + radius * Math.cos(endAngleRad);
                            const endY = centerY + radius * Math.sin(endAngleRad);
                            
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            
                            const pathData = [
                                "M", centerX, centerY,
                                "L", startX, startY,
                                "A", radius, radius, 0, largeArcFlag, 1, endX, endY,
                                "Z"
                            ].join(" ");
                            
                            currentAngle += angle;
                            
                            return (
                                <path
                                    key={index}
                                    d={pathData}
                                    fill={getColor(item.label, index)}
                                    stroke="white"
                                    strokeWidth="2"
                                />
                            );
                        })}
                    </svg>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                        <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: getColor(item.label, index) }}
                        ></div>
                        <span className="text-sm text-gray-700">
                            {item.label}: {item.value} ({((item.value / total) * 100).toFixed(1)}%)
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}