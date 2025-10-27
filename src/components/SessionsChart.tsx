import { useState, useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { faker } from '@faker-js/faker';
import { getResolvedColor } from '../lib/utils';
import { useTheme } from '../providers/ThemeProvider';
import { BarChart3 } from 'lucide-react';

const timeFilters = ['24 Horas', '7 Días', '28 Días', '3 Meses', '1 Año'];

const generateChartData = (filter: string) => {
  switch (filter) {
    case '24 Horas':
      return {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        data: Array.from({ length: 24 }, () => faker.number.int({ min: 0, max: 10 })),
      };
    case '7 Días':
      return {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        data: Array.from({ length: 7 }, () => faker.number.int({ min: 50, max: 200 })),
      };
    case '28 Días':
      return {
        labels: Array.from({ length: 28 }, (_, i) => `Día ${i + 1}`),
        data: Array.from({ length: 28 }, () => faker.number.int({ min: 50, max: 200 })),
      };
    case '3 Meses':
      return {
        labels: ['Mes 1', 'Mes 2', 'Mes 3'],
        data: Array.from({ length: 3 }, () => faker.number.int({ min: 2000, max: 8000 })),
      };
    case '1 Año':
      return {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        data: Array.from({ length: 12 }, () => faker.number.int({ min: 2000, max: 8000 })),
      };
    default:
      return { labels: [], data: [] };
  }
};

export function SessionsChart() {
  const [activeFilter, setActiveFilter] = useState('7 Días');
  const [mounted, setMounted] = useState(false);
  const chartData = useMemo(() => generateChartData(activeFilter), [activeFilter]);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const option = useMemo(() => {
    if (!mounted) return {};

    const primaryColor = getResolvedColor('--primary');
    const borderColor = getResolvedColor('--border');
    const foregroundColor = getResolvedColor('--foreground');
    const mutedForegroundColor = getResolvedColor('--muted-foreground');
    const backgroundColor = getResolvedColor('--background');

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
        data: chartData.labels,
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
          name: 'Sesiones',
          type: 'bar',
          barWidth: '60%',
          data: chartData.data,
          itemStyle: {
            color: primaryColor,
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [theme, chartData, mounted]);

  return (
    <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Indicador de Sesiones</h3>
            <p className="text-sm text-muted-foreground mt-1">Cantidad de sesiones por período</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg self-start">
          {timeFilters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeFilter === filter
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 h-80">
        {mounted ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} lazyUpdate={true} />
        ) : (
          <div className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
