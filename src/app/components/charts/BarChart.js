'use client';

import { useEffect, useRef } from 'react';

export default function BarChart({ data, title, colors = [], horizontal = false, stacked = false }) {
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

                // Support for single dataset or multiple datasets
                let datasets;
                if (Array.isArray(data.datasets)) {
                    datasets = data.datasets.map((dataset, index) => ({
                        ...dataset,
                        backgroundColor: dataset.backgroundColor || chartColors[index % chartColors.length],
                        borderColor: dataset.borderColor || chartColors[index % chartColors.length],
                        borderWidth: 2,
                        borderRadius: horizontal ? { topRight: 4, bottomRight: 4 } : { topLeft: 4, topRight: 4 },
                        hoverBorderWidth: 3
                    }));
                } else {
                    datasets = [{
                        label: data.label || 'Data',
                        data: data.values || data.data,
                        backgroundColor: chartColors.slice(0, data.values?.length || data.data?.length),
                        borderColor: chartColors.slice(0, data.values?.length || data.data?.length),
                        borderWidth: 2,
                        borderRadius: horizontal ? { topRight: 4, bottomRight: 4 } : { topLeft: 4, topRight: 4 },
                        hoverBorderWidth: 3
                    }];
                }

                chartInstance.current = new Chart.default(ctx, {
                    type: horizontal ? 'bar' : 'bar',
                    data: {
                        labels: data.labels,
                        datasets: datasets
                    },
                    options: {
                        indexAxis: horizontal ? 'y' : 'x',
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                beginAtZero: true,
                                stacked: stacked,
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)',
                                    lineWidth: 1
                                },
                                ticks: {
                                    color: '#6B7280',
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            y: {
                                beginAtZero: true,
                                stacked: stacked,
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)',
                                    lineWidth: 1
                                },
                                ticks: {
                                    color: '#6B7280',
                                    font: {
                                        size: 12
                                    }
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: title,
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                },
                                color: '#374151',
                                padding: {
                                    bottom: 20
                                }
                            },
                            legend: {
                                position: 'top',
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
                                        let label = context.dataset.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        label += context.parsed.y !== null ? context.parsed.y : context.parsed.x;
                                        return label;
                                    }
                                }
                            }
                        },
                        animation: {
                            duration: 1000,
                            easing: 'easeOutQuart'
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
    }, [data, title, colors, horizontal, stacked]);

    return (
        <div className="relative h-80 w-full">
            <canvas ref={chartRef}></canvas>
        </div>
    );
}