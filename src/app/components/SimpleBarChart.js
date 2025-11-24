'use client';

export default function SimpleBarChart({ data, title, xLabel, yLabel }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No data available for {title}</p>
            </div>
        );
    }

    const maxValue = Math.max(...data.map(item => item.value));
    const chartHeight = 200;
    const chartWidth = 400;
    const barWidth = chartWidth / data.length - 10;
    
    return (
        <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 text-center">{title}</h4>
            <div className="flex items-center justify-center">
                <div className="relative">
                    <svg width={chartWidth + 40} height={chartHeight + 60} className="overflow-visible">
                        {/* Y-axis */}
                        <line x1="30" y1="10" x2="30" y2={chartHeight + 10} stroke="#ccc" strokeWidth="1"/>
                        {/* X-axis */}
                        <line x1="30" y1={chartHeight + 10} x2={chartWidth + 30} y2={chartHeight + 10} stroke="#ccc" strokeWidth="1"/>
                        
                        {/* Bars */}
                        {data.map((item, index) => {
                            const barHeight = (item.value / maxValue) * chartHeight;
                            const x = 35 + index * (chartWidth / data.length);
                            const y = chartHeight + 10 - barHeight;
                            
                            return (
                                <g key={index}>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={barWidth}
                                        height={barHeight}
                                        fill="#355E3B"
                                        stroke="white"
                                        strokeWidth="1"
                                        rx="2"
                                    />
                                    <text
                                        x={x + barWidth / 2}
                                        y={y - 5}
                                        textAnchor="middle"
                                        className="text-xs fill-gray-700"
                                    >
                                        {item.value}
                                    </text>
                                    <text
                                        x={x + barWidth / 2}
                                        y={chartHeight + 25}
                                        textAnchor="middle"
                                        className="text-xs fill-gray-600"
                                    >
                                        {item.label}
                                    </text>
                                </g>
                            );
                        })}
                        
                        {/* Y-axis label */}
                        {yLabel && (
                            <text
                                x="15"
                                y={chartHeight / 2 + 10}
                                textAnchor="middle"
                                className="text-sm fill-gray-600"
                                transform={`rotate(-90, 15, ${chartHeight / 2 + 10})`}
                            >
                                {yLabel}
                            </text>
                        )}
                        
                        {/* X-axis label */}
                        {xLabel && (
                            <text
                                x={chartWidth / 2 + 30}
                                y={chartHeight + 45}
                                textAnchor="middle"
                                className="text-sm fill-gray-600"
                            >
                                {xLabel}
                            </text>
                        )}
                    </svg>
                </div>
            </div>
        </div>
    );
}