import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedProduct {
  title: string;
  price: number;
  regular_price?: number;
  description: string;
  images: string[];
  thumbnail: string;
  sku: string;
  brand: string;
  categories: string[];
  attributes: { label: string; value: string }[];
}

export class ScraperUtils {
  static async scrapeKcbazar(url: string): Promise<ScrapedProduct> {
    const PROXY_URL =
      'https://script.google.com/macros/s/AKfycbwnQgM5Tw09rhwYaF3adKHkOPQnuvz8zEZr99jkB-yVGENE4LE547UvV0dvFJda9hyhaQ/exec';

    try {
      let data: any;
      try {
        // Try direct fetch first
        const response = await axios.get(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 15000,
        });
        data = response.data;
      } catch (directError) {
        // Fallback to proxy if direct request fails
        const response = await axios.get(
          `${PROXY_URL}?url=${encodeURIComponent(url)}`,
          {
            timeout: 30000,
          },
        );
        data = response.data;
      }

      const $ = cheerio.load(data);

      // Clean up navigation and unrelated elements that might contain other product info
      $(
        '.wd-products-nav, .wd-back-btn, .wd-search-opened, .related, .upsells',
      ).remove();

      const title = $('h1.product_title').first().text().trim();

      // Price parsing
      const parsePrice = (text: string) => {
        if (!text) return 0;
        // Split by dash to handle ranges and take the first price
        const part = text.split(/[-–—]/)[0];
        return parseFloat(part.replace(/[^\d.]/g, '')) || 0;
      };

      const summary = $(
        '.entry-summary, .product-image-summary, .single-product-content, .summary',
      ).first();
      const priceContainer = summary.find('.wd-single-price, .price').first();

      let price = 0;
      let regular_price = 0;

      if (priceContainer.length) {
        const ins = priceContainer.find('ins .woocommerce-Price-amount');
        const del = priceContainer.find('del .woocommerce-Price-amount');
        const simple = priceContainer.find('.woocommerce-Price-amount');

        if (ins.length) {
          price = parsePrice(ins.text());
          regular_price = parsePrice(del.text()) || price;
        } else {
          price = parsePrice(simple.first().text());
          regular_price = price;
        }
      } else {
        // Fallback 1: any price amount in summary
        price = parsePrice(
          summary.find('.woocommerce-Price-amount').first().text(),
        );

        // Fallback 2: search entire page if summary failed
        if (price === 0) {
          price =
            parsePrice($('.price').first().text()) ||
            parsePrice($('.woocommerce-Price-amount').first().text());
        }

        regular_price = price;
      }

      // SKU
      const sku = $('.sku_wrapper .sku').text().trim();

      // Brand
      let brand =
        $('.summary .wd-product-brand a').first().text().trim() ||
        $('.summary a[href*="/attribute/brand/"]').first().text().trim();

      // Attributes
      const attributes: { label: string; value: string }[] = [];
      $('.woocommerce-product-attributes-item').each((_, el) => {
        const label = $(el)
          .find('.woocommerce-product-attributes-item__label')
          .text()
          .trim();
        const value = $(el)
          .find('.woocommerce-product-attributes-item__value')
          .text()
          .trim();
        if (label && value) {
          attributes.push({ label, value });
          if (!brand && label.toLowerCase() === 'brand') {
            brand = value;
          }
        }
      });

      // Categories
      const categories: string[] = [];
      $('.posted_in a').each((_, el) => {
        categories.push($(el).text().trim());
      });

      // Images
      const images: string[] = [];
      $('.woocommerce-product-gallery__image img').each((_, el) => {
        const src = $(el).attr('data-src') || $(el).attr('src');
        if (src && !src.includes('lazy.svg') && !images.includes(src))
          images.push(src);
      });

      // Gallery images often in wd-carousel
      $('.wd-carousel-item img').each((_, el) => {
        const src = $(el).attr('data-lazy-src') || $(el).attr('src');
        if (src && !src.includes('lazy.svg') && !images.includes(src))
          images.push(src);
      });

      const thumbnail = images.length > 0 ? images[0] : '';

      // Description
      const description =
        $('#tab-description').html() ||
        $('.woocommerce-product-details__short-description').html() ||
        '';

      return {
        title,
        price,
        regular_price,
        description,
        images,
        thumbnail,
        sku,
        brand,
        categories,
        attributes,
      };
    } catch (error: any) {
      console.error('Error scraping Kcbazar:', error?.message);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          throw new Error(
            'Access forbidden: KCBazar might be blocking the server IP (Common on Vercel)',
          );
        }
        if (error.code === 'ECONNABORTED') {
          throw new Error(
            'Scraping timed out: KCBazar took too long to respond',
          );
        }
      }

      throw new Error(
        `Failed to scrape product data: ${error?.message || 'Unknown error'}`,
      );
    }
  }
}
