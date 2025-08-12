import { BigQuery } from '@google-cloud/bigquery';

/**
 * BigQuery Client for dataset search operations
 */
export class BigQueryClient {
  private bigquery: BigQuery;
  private datasetId: string;
  private tableId: string;

  constructor(
    datasetId: string = 'snap3_datasets',
    tableId: string = 'vdp_metadata'
  ) {
    this.bigquery = new BigQuery({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCS_KEY_FILE,
    });
    this.datasetId = datasetId;
    this.tableId = tableId;
  }

  /**
   * Search datasets by content ID
   */
  async searchByContentId(contentId: string): Promise<any[]> {
    const query = `
      SELECT 
        content_id,
        platform,
        origin,
        created_at,
        view_count,
        like_count,
        duration_seconds,
        aspect_ratio,
        digest_id,
        trust_score
      FROM \`${this.datasetId}.${this.tableId}\`
      WHERE content_id = @contentId
      LIMIT 100
    `;

    const options = {
      query,
      params: { contentId },
    };

    const [rows] = await this.bigquery.query(options);
    return rows;
  }

  /**
   * Search datasets by platform
   */
  async searchByPlatform(platform: string): Promise<any[]> {
    const query = `
      SELECT 
        content_id,
        platform,
        origin,
        created_at,
        view_count,
        like_count,
        duration_seconds,
        aspect_ratio,
        digest_id,
        trust_score
      FROM \`${this.datasetId}.${this.tableId}\`
      WHERE LOWER(platform) = LOWER(@platform)
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const options = {
      query,
      params: { platform },
    };

    const [rows] = await this.bigquery.query(options);
    return rows;
  }

  /**
   * Search datasets by origin (Real-Footage | AI-Generated)
   */
  async searchByOrigin(origin: string): Promise<any[]> {
    const query = `
      SELECT 
        content_id,
        platform,
        origin,
        created_at,
        view_count,
        like_count,
        duration_seconds,
        aspect_ratio,
        digest_id,
        trust_score
      FROM \`${this.datasetId}.${this.tableId}\`
      WHERE LOWER(origin) = LOWER(@origin)
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const options = {
      query,
      params: { origin },
    };

    const [rows] = await this.bigquery.query(options);
    return rows;
  }

  /**
   * Search datasets by date range
   */
  async searchByDateRange(startDate: string, endDate: string): Promise<any[]> {
    const query = `
      SELECT 
        content_id,
        platform,
        origin,
        created_at,
        view_count,
        like_count,
        duration_seconds,
        aspect_ratio,
        digest_id,
        trust_score
      FROM \`${this.datasetId}.${this.tableId}\`
      WHERE DATE(created_at) BETWEEN @startDate AND @endDate
      ORDER BY created_at DESC
      LIMIT 500
    `;

    const options = {
      query,
      params: { startDate, endDate },
    };

    const [rows] = await this.bigquery.query(options);
    return rows;
  }

  /**
   * Advanced search with multiple filters
   */
  async advancedSearch(filters: {
    contentId?: string;
    platform?: string;
    origin?: string;
    startDate?: string;
    endDate?: string;
    minViews?: number;
    maxDuration?: number;
  }): Promise<any[]> {
    let whereConditions: string[] = ['1=1'];
    const params: any = {};

    if (filters.contentId) {
      whereConditions.push('content_id = @contentId');
      params.contentId = filters.contentId;
    }

    if (filters.platform) {
      whereConditions.push('LOWER(platform) = LOWER(@platform)');
      params.platform = filters.platform;
    }

    if (filters.origin) {
      whereConditions.push('LOWER(origin) = LOWER(@origin)');
      params.origin = filters.origin;
    }

    if (filters.startDate && filters.endDate) {
      whereConditions.push('DATE(created_at) BETWEEN @startDate AND @endDate');
      params.startDate = filters.startDate;
      params.endDate = filters.endDate;
    }

    if (filters.minViews !== undefined) {
      whereConditions.push('view_count >= @minViews');
      params.minViews = filters.minViews;
    }

    if (filters.maxDuration !== undefined) {
      whereConditions.push('duration_seconds <= @maxDuration');
      params.maxDuration = filters.maxDuration;
    }

    const query = `
      SELECT 
        content_id,
        platform,
        origin,
        created_at,
        view_count,
        like_count,
        comment_count,
        share_count,
        duration_seconds,
        aspect_ratio,
        digest_id,
        trust_score,
        hashtags,
        product_mentions
      FROM \`${this.datasetId}.${this.tableId}\`
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY view_count DESC, created_at DESC
      LIMIT 500
    `;

    const options = {
      query,
      params,
    };

    const [rows] = await this.bigquery.query(options);
    return rows;
  }
}