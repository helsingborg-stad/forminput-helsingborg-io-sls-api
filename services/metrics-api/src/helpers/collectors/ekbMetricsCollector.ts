import casesRepository, { createStatusCollection } from '../cases';
import MetricBuilder from '../metricBuilder';
import { MetricsHelperText, MetricType } from '../metrics.constants';
import type { StatusCollection } from '../cases';
import type { Metric } from '../metrics.types';
import type { MetricsCollector } from './metricsCollector';

type CaseMeta = {
  status: string;
};

function createCasesMetrics(collection: StatusCollection) {
  const metrics = Object.entries(collection).map(([metricName, values]) => {
    const builder = new MetricBuilder<CaseMeta>(metricName);

    builder.setHelp(MetricsHelperText[metricName]);
    builder.setType(MetricType.GAUGE);

    Object.entries(values).forEach(([status, value]) => {
      builder.addValue({ value, meta: { status } });
    });

    return builder.getMetric();
  });

  return metrics;
}

const ekb: MetricsCollector<CaseMeta> = {
  async collect(): Promise<Metric<CaseMeta>[]> {
    const cases = await casesRepository.get();
    const statusCollection = createStatusCollection(cases);
    const casesMetrics = createCasesMetrics(statusCollection);
    return casesMetrics;
  },
};

export default ekb;
