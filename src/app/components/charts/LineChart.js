'use client';

import { useEffect, useRef } from 'react';

export default function LineChart({ data, title, colors = [], fill = false, tension = 0.4 }) {
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
                        borderColor: dataset.borderColor || chartColors[index % chartColors.length],
                        backgroundColor: fill
                            ? (dataset.backgroundColor || chartColors[index % chartColors.length] + '20')
                            : 'transparent',
                        borderWidth: 3,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: dataset.borderColor || chartColors[index % chartColors.length],
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        tension: tension,
                        fill: fill
                    }));
                } else {
                    datasets = [{
                        label: data.label || 'Data',
                        data: data.values || data.data,
                        borderColor: chartColors[0],
                        backgroundColor: fill ? chartColors[0] + '20' : 'transparent',
                        borderWidth: 3,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: chartColors[0],
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        tension: tension,
                        fill: fill
                    }];
                }

                chartInstance.current = new Chart.default(ctx, {
                    type: 'line',
                    data: {
                        labels: data.labels,
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        },
                        scales: {
                            x: {
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
                                        label += context.parsed.y;
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
    }, [data, title, colors, fill, tension]);

    return (
        <div className="relative h-80 w-full">
            <canvas ref={chartRef}></canvas>
        </div>
    );
}