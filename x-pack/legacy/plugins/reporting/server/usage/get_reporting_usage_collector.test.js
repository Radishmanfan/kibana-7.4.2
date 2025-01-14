/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import { getReportingUsageCollector } from './get_reporting_usage_collector';

function getServerMock(customization) {
  class MockUsageCollector {
    constructor(_server, { fetch }) { // eslint-disable-line no-unused-vars
      this.fetch = fetch;
    }
  }

  const getLicenseCheckResults = sinon.stub().returns({});
  const defaultServerMock = {
    plugins: {
      security: {
        isAuthenticated: sinon.stub().returns(true),
      },
      xpack_main: {
        info: {
          isAvailable: sinon.stub().returns(true),
          feature: () => ({
            getLicenseCheckResults,
          }),
          license: {
            isOneOf: sinon.stub().returns(false),
            getType: sinon.stub().returns('platinum'),
          },
          toJSON: () => ({ b: 1 }),
        },
      },
    },
    expose: () => {},
    log: () => {},
    config: () => ({
      get: key => {
        if (key === 'xpack.reporting.enabled') {
          return true;
        } else if (key === 'xpack.reporting.index') {
          return '.reporting-index';
        }
      },
    }),
    usage: {
      collectorSet: {
        makeUsageCollector: options => {
          return new MockUsageCollector(this, options);
        },
      },
    },
  };
  return Object.assign(defaultServerMock, customization);
}

const getResponseMock = (customization = {}) => customization;

describe('license checks', () => {
  describe('with a basic license', () => {
    let usageStats;
    beforeAll(async () => {
      const serverWithBasicLicenseMock = getServerMock();
      serverWithBasicLicenseMock.plugins.xpack_main.info.license.getType = sinon
        .stub()
        .returns('basic');
      const callClusterMock = jest.fn(() => Promise.resolve(getResponseMock()));
      const { fetch: getReportingUsage } = getReportingUsageCollector(serverWithBasicLicenseMock);
      usageStats = await getReportingUsage(callClusterMock);
    });

    test('sets enables to true', async () => {
      expect(usageStats.enabled).toBe(true);
    });

    test('sets csv available to true', async () => {
      expect(usageStats.csv.available).toBe(true);
    });

    test('sets pdf availability to false', async () => {
      expect(usageStats.printable_pdf.available).toBe(false);
    });
  });

  describe('with no license', () => {
    let usageStats;
    beforeAll(async () => {
      const serverWithNoLicenseMock = getServerMock();
      serverWithNoLicenseMock.plugins.xpack_main.info.license.getType = sinon
        .stub()
        .returns('none');
      const callClusterMock = jest.fn(() => Promise.resolve(getResponseMock()));
      const { fetch: getReportingUsage } = getReportingUsageCollector(serverWithNoLicenseMock);
      usageStats = await getReportingUsage(callClusterMock);
    });

    test('sets enables to true', async () => {
      expect(usageStats.enabled).toBe(true);
    });

    test('sets csv available to false', async () => {
      expect(usageStats.csv.available).toBe(false);
    });

    test('sets pdf availability to false', async () => {
      expect(usageStats.printable_pdf.available).toBe(false);
    });
  });

  describe('with platinum license', () => {
    let usageStats;
    beforeAll(async () => {
      const serverWithPlatinumLicenseMock = getServerMock();
      serverWithPlatinumLicenseMock.plugins.xpack_main.info.license.getType = sinon
        .stub()
        .returns('platinum');
      const callClusterMock = jest.fn(() => Promise.resolve(getResponseMock()));
      const { fetch: getReportingUsage } = getReportingUsageCollector(
        serverWithPlatinumLicenseMock
      );
      usageStats = await getReportingUsage(callClusterMock);
    });

    test('sets enables to true', async () => {
      expect(usageStats.enabled).toBe(true);
    });

    test('sets csv available to true', async () => {
      expect(usageStats.csv.available).toBe(true);
    });

    test('sets pdf availability to true', async () => {
      expect(usageStats.printable_pdf.available).toBe(true);
    });
  });

  describe('with no usage data', () => {
    let usageStats;
    beforeAll(async () => {
      const serverWithBasicLicenseMock = getServerMock();
      serverWithBasicLicenseMock.plugins.xpack_main.info.license.getType = sinon
        .stub()
        .returns('basic');
      const callClusterMock = jest.fn(() => Promise.resolve({}));
      const { fetch: getReportingUsage } = getReportingUsageCollector(serverWithBasicLicenseMock);
      usageStats = await getReportingUsage(callClusterMock);
    });

    test('sets enables to true', async () => {
      expect(usageStats.enabled).toBe(true);
    });

    test('sets csv available to true', async () => {
      expect(usageStats.csv.available).toBe(true);
    });
  });
});

describe('data modeling', () => {
  let getReportingUsage;
  beforeAll(async () => {
    const serverWithPlatinumLicenseMock = getServerMock();
    serverWithPlatinumLicenseMock.plugins.xpack_main.info.license.getType = sinon
      .stub()
      .returns('platinum');
    ({ fetch: getReportingUsage } = getReportingUsageCollector(serverWithPlatinumLicenseMock));
  });

  test('with normal looking usage data', async () => {
    const callClusterMock = jest.fn(() =>
      Promise.resolve(
        getResponseMock({
          aggregations: {
            ranges: {
              buckets: {
                all: {
                  doc_count: 54,
                  layoutTypes: {
                    doc_count: 23,
                    pdf: {
                      doc_count_error_upper_bound: 0,
                      sum_other_doc_count: 0,
                      buckets: [
                        { key: 'preserve_layout', doc_count: 13 },
                        { key: 'print', doc_count: 10 },
                      ],
                    },
                  },
                  objectTypes: {
                    doc_count: 23,
                    pdf: {
                      doc_count_error_upper_bound: 0,
                      sum_other_doc_count: 0,
                      buckets: [{ key: 'dashboard', doc_count: 23 }],
                    },
                  },
                  statusTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      { key: 'pending', doc_count: 33 },
                      { key: 'completed', doc_count: 20 },
                      { key: 'processing', doc_count: 1 },
                    ],
                  },
                  jobTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      { key: 'csv', doc_count: 27 },
                      { key: 'printable_pdf', doc_count: 23 },
                      { key: 'PNG', doc_count: 4 },
                    ],
                  },
                },
                lastDay: {
                  doc_count: 11,
                  layoutTypes: {
                    doc_count: 2,
                    pdf: {
                      doc_count_error_upper_bound: 0,
                      sum_other_doc_count: 0,
                      buckets: [{ key: 'print', doc_count: 2 }],
                    },
                  },
                  objectTypes: {
                    doc_count: 2,
                    pdf: {
                      doc_count_error_upper_bound: 0,
                      sum_other_doc_count: 0,
                      buckets: [{ key: 'dashboard', doc_count: 2 }],
                    },
                  },
                  statusTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [{ key: 'pending', doc_count: 11 }],
                  },
                  jobTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      { key: 'csv', doc_count: 5 },
                      { key: 'PNG', doc_count: 4 },
                      { key: 'printable_pdf', doc_count: 2 },
                    ],
                  },
                },
                last7Days: {
                  doc_count: 27,
                  layoutTypes: {
                    doc_count: 13,
                    pdf: {
                      doc_count_error_upper_bound: 0,
                      sum_other_doc_count: 0,
                      buckets: [
                        { key: 'print', doc_count: 10 },
                        { key: 'preserve_layout', doc_count: 3 },
                      ],
                    },
                  },
                  objectTypes: {
                    doc_count: 13,
                    pdf: {
                      doc_count_error_upper_bound: 0,
                      sum_other_doc_count: 0,
                      buckets: [{ key: 'dashboard', doc_count: 13 }],
                    },
                  },
                  statusTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [{ key: 'pending', doc_count: 27 }],
                  },
                  jobTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      { key: 'printable_pdf', doc_count: 13 },
                      { key: 'csv', doc_count: 10 },
                      { key: 'PNG', doc_count: 4 },
                    ],
                  },
                },
              },
            },
          },
        })
      )
    );
    const usageStats = await getReportingUsage(callClusterMock);
    expect(usageStats).toMatchInlineSnapshot(`
Object {
  "PNG": Object {
    "available": true,
    "total": 4,
  },
  "_all": 54,
  "available": true,
  "browser_type": undefined,
  "csv": Object {
    "available": true,
    "total": 27,
  },
  "enabled": true,
  "last7Days": Object {
    "PNG": Object {
      "available": true,
      "total": 4,
    },
    "_all": 27,
    "csv": Object {
      "available": true,
      "total": 10,
    },
    "printable_pdf": Object {
      "app": Object {
        "dashboard": 13,
        "visualization": 0,
      },
      "available": true,
      "layout": Object {
        "preserve_layout": 3,
        "print": 10,
      },
      "total": 13,
    },
    "status": Object {
      "completed": 0,
      "failed": 0,
      "pending": 27,
    },
  },
  "lastDay": Object {
    "PNG": Object {
      "available": true,
      "total": 4,
    },
    "_all": 11,
    "csv": Object {
      "available": true,
      "total": 5,
    },
    "printable_pdf": Object {
      "app": Object {
        "dashboard": 2,
        "visualization": 0,
      },
      "available": true,
      "layout": Object {
        "preserve_layout": 0,
        "print": 2,
      },
      "total": 2,
    },
    "status": Object {
      "completed": 0,
      "failed": 0,
      "pending": 11,
    },
  },
  "printable_pdf": Object {
    "app": Object {
      "dashboard": 23,
      "visualization": 0,
    },
    "available": true,
    "layout": Object {
      "preserve_layout": 13,
      "print": 10,
    },
    "total": 23,
  },
  "status": Object {
    "completed": 20,
    "failed": 0,
    "pending": 33,
    "processing": 1,
  },
}
`);
  });
});
