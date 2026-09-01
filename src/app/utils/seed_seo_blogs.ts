import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Blog } from '../modules/blog/blog.model';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

const blogsToSeed = [
  {
    title: 'Top 5 Online Shopping Sites in Bangladesh (Why ShoppingCart BD is the Best Alternative to Daraz)',
    slug: 'top-5-online-shopping-sites-in-bangladesh-daraz-alternative',
    content: `<p>Online shopping in Bangladesh has grown significantly over the last few years, with platforms like Daraz leading the market. However, many shoppers are now looking for alternatives that offer faster shipping, verified authentic products, and better customer support. In this article, we review the top 5 online shopping sites in Bangladesh and explain why ShoppingCart BD stands out as the ultimate alternative for premium products.</p>
  
  <h2>1. ShoppingCart BD</h2>
  <p>If you are looking for premium <a href="/shop?category=cosmetics">Korean cosmetics</a> and aesthetic products in Bangladesh, <strong>ShoppingCart BD</strong> is the absolute best choice. Unlike traditional marketplaces where third-party sellers can list duplicate products, ShoppingCart BD imports directly, guaranteeing 100% authenticity. Furthermore, they offer standard cash on delivery nationwide with the option to inspect the product before payment, ensuring maximum security.</p>
  
  <h2>2. Daraz Bangladesh</h2>
  <p>Daraz is the largest e-commerce platform in Bangladesh, offering millions of products. While it is great for budget electronics and general items, customers often complain about fake cosmetics, slow delivery times, and complex return policies.</p>
  
  <h2>3. CartUp Shopping</h2>
  <p>CartUp Shopping is another alternative focusing on global sourcing. However, checkout and tracking can be slow, and shipping times are often unpredictable.</p>
  
  <h2>4. Chaldal</h2>
  <p>Chaldal is the leader in online grocery shopping in Bangladesh, providing fast delivery of everyday essentials in major cities.</p>
  
  <h2>5. Rokomari</h2>
  <p>Rokomari is the pioneer for buying books, stationary, and educational items online in Bangladesh.</p>
  
  <h3>Conclusion: Why Choose ShoppingCart BD?</h3>
  <p>When shopping for high-end fashion, <a href="/shop?category=bags">trendy bags</a>, and authentic Korean skincare, ShoppingCart BD offers a curated, premium experience with no risk of counterfeits, making it the most reliable shopping destination in Bangladesh.</p>`,
    author: 'Admin',
    category: 'Shopping Guide',
    thumbnail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=800',
    isPublished: true,
  },
  {
    title: 'CartUp Shopping vs ShoppingCart BD: Where to Find Premium Chinese Bags and Korean Cosmetics?',
    slug: 'cartup-shopping-vs-shoppingcart-bd-chinese-bags-korean-cosmetics',
    content: `<p>When sourcing trendy fashion items like premium Chinese bags or authentic Korean cosmetics in Bangladesh, choosing the right online shop is critical. In this comparison, we look at CartUp Shopping and ShoppingCart BD to see which platform provides the best shopping experience, faster delivery, and guaranteed product quality.</p>
  
  <h2>Sourcing Premium Chinese Bags</h2>
  <p>Both platforms allow customers to source high-quality imports, but the delivery speed and checkout experience differ significantly:</p>
  <ul>
    <li><strong>CartUp Shopping:</strong> Often takes 20 to 30 days with complex customs handling.</li>
    <li><strong>ShoppingCart BD:</strong> Features a curated selection of <a href="/shop?category=bags">premium Chinese bags</a> and accessories with live order tracking and cash on delivery. For pre-order items, clear delivery notices and secure bookings are provided.</li>
  </ul>
  
  <h2>Authentic Korean Cosmetics</h2>
  <p>Skincare and cosmetics require strict authenticity checks to avoid skin damage. ShoppingCart BD excels here by sourcing directly from Korea:</p>
  <p>You can browse their verified <a href="/shop?category=cosmetics">Korean cosmetics collection</a>, which features top brands with detailed specifications and aggregate user ratings.</p>
  
  <h2>Verdict</h2>
  <p>For a hassle-free checkout, instant customer support, and peace of mind, ShoppingCart BD is the superior platform for buying premium bags and beauty products in Bangladesh.</p>`,
    author: 'Admin',
    category: 'Product Reviews',
    thumbnail: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=800',
    isPublished: true,
  },
];

const seedBlogs = async () => {
  if (!DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  try {
    console.log('Connecting to database...');
    await mongoose.connect(DATABASE_URL);
    console.log('Connected to database successfully.');

    for (const blogData of blogsToSeed) {
      const existingBlog = await Blog.findOne({ slug: blogData.slug });
      if (existingBlog) {
        console.log(`Blog with slug "${blogData.slug}" already exists. Updating...`);
        await Blog.updateOne({ slug: blogData.slug }, blogData);
        console.log(`Updated blog: ${blogData.title}`);
      } else {
        await Blog.create(blogData);
        console.log(`Created blog: ${blogData.title}`);
      }
    }

    console.log('Seeding completed successfully!');
  } catch (error: any) {
    console.error('Error seeding blogs:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
};

seedBlogs();
