'use client';

import { useEffect, useRef } from 'react';

export default function PieChart({ data, title, colors = [] }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && chartRef.current && data) {
            import('chart.js/auto').then((Chart) => {
                // Destroy existing chart
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }

                const ctx = chartRef.current.getContext('2d');

                const defaultColors = [
                    '#355E3B', // Dark Green
                    '#FFD700', // Gold
                    '#4F81BD', // Blue
                    '#F79646', // Orange
                    '#9BBB58', // Light Green
                    '#8064A2', // Purple
                    '#4BACC6', // Light Blue
                    '#F24C3D', // Red
                    '#95A5A6', // Gray
                    '#E67E22'  // Dark Orange
                ];

                const chartColors = colors.length > 0 ? colors : defaultColors;

                chartInstance.current = new Chart.default(ctx, {
                    type: 'pie',
                    data: {
                        labels: data.map(item => item.label),
                        datasets: [{
                            data: data.map(item => item.value),
                            backgroundColor: chartColors.slice(0, data.length),
                            borderWidth: 2,
                            borderColor: '#ffffff',
                            hoverBorderWidth: 3,
                            hoverBorderColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: title,
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                },
                                color: '#374151'
                            },
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true,
                                    color: '#374151',
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleColor: '#ffffff',
                                bodyColor: '#ffffff',
                                callbacks: {
                                    label: function (context) {
                                        const label = context.label || '';
                                        const value = context.parsed;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return `${label}: ${value} (${percentage}%)`;
                                    }
                                }
                            }
                        },
                        animation: {
                            animateRotate: true,
                            duration: 1000
                        }
                    }
                });
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data, title, colors]);

    return (
        <div className="relative h-80 w-full">
            <canvas ref={chartRef}></canvas>
        </div>
    );
}