import { useMemo, useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { getResolvedColor, getResolvedColorWithAlpha } from '../lib/utils';
import { useTheme } from '../providers/ThemeProvider';

export function ActivityChart() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const option = useMemo(() => {
    if (!mounted) return {};

    const primaryColor = getResolvedColor('--primary');
    const backgroundColor = getResolvedColor('--background');
    const borderColor = getResolvedColor('--border');
    const foregroundColor = getResolvedColor('--foreground');
    const mutedForegroundColor = getResolvedColor('--muted-foreground');
    const transparentPrimary = getResolvedColorWithAlpha('--primary', 0);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        textStyle: {
          color: foregroundColor,
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        axisLine: {
          lineStyle: {
            color: mutedForegroundColor,
          },
        },
        axisLabel: {
          color: mutedForegroundColor,
        },
      },
      yAxis: {
        type: 'value',
        splitLine: {
          lineStyle: {
            color: borderColor,
          },
        },
        axisLabel: {
          color: mutedForegroundColor,
        },
      },
      series: [
        {
          name: 'Entrenamientos',
          type: 'line',
          stack: 'Total',
          smooth: true,
          lineStyle: {
            width: 2,
            color: primaryColor,
          },
          showSymbol: false,
          areaStyle: {
            opacity: 0.2,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: primaryColor,
                },
                {
                  offset: 1,
                  color: transparentPrimary,
                },
              ],
            },
          },
          emphasis: {
            focus: 'series',
          },
          data: [2, 5, 3, 8, 4, 10, 6],
        },
      ],
    };
  }, [theme, mounted]);

  if (!mounted) return <div className="h-full w-full" />;

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} lazyUpdate={true} />;
}
