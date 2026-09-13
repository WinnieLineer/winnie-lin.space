import axios from 'axios';

const GITHUB_API_URL = 'https://api.github.com';
const REPO_OWNER = 'WinnieLineer';
const REPO_NAME = 'blog-post';

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  content: string;
}

// Typed frontmatter shape
interface FrontmatterData {
  title?: string;
  excerpt?: string;
  date?: string;
  tags?: string | string[];
  [key: string]: string | string[] | undefined; // allow dynamic key assignment during parsing
}

// Custom lightweight frontmatter parser
function parseFrontmatter(fileContent: string): { data: FrontmatterData; content: string } {
  const frontmatterRegex = /^---\r?\n([\s\S]+?)\r?\n---\r?\n/;
  const match = frontmatterRegex.exec(fileContent);

  if (!match) {
    return { data: {}, content: fileContent };
  }

  const frontmatter = match[1];
  const content = fileContent.slice(match[0].length);
  const data: FrontmatterData = {};

  frontmatter.split(/\r?\n/).forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim().replace(/['"\[\]]/g, '');
      if (key.trim() === 'tags') {
        data[key.trim()] = value.split(',').map(tag => tag.trim());
      } else {
        data[key.trim()] = value;
      }
    }
  });

  return { data, content };
}

// Fetches the list of all posts
export const getPosts = async (): Promise<Post[]> => {
  try {
    const { data: files } = await axios.get(
      `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/contents`
    );

    const posts = await Promise.all(
      files
        .filter((file: any) => file.name.endsWith('.md'))
        .map(async (file: any) => {
          // For the list view, we now fetch and parse each file to get accurate metadata.
          const { data: fileContent } = await axios.get(file.download_url);
          const { data: metadata } = parseFrontmatter(fileContent);
          const slug = file.name.replace('.md', '');
          
          return {
            slug,
            title: metadata.title || 'Untitled',
            excerpt: metadata.excerpt || '',
            date: metadata.date || new Date().toISOString(),
            tags: metadata.tags || [],
            content: '', // Full content is not needed for the list view
          };
        })
    );

    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
};

// Fetches a single post by its slug using the robust API endpoint
export const getPostBySlug = async (slug: string): Promise<Post | null> => {
  try {
    const { data: file } = await axios.get(
      `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${slug}.md`
    );

    // Safely decode Base64 content that may include multi-byte UTF-8 (Chinese, emoji, etc.)
    const rawBase64 = file.content.replace(/\s/g, '');
    const bytes = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));
    const fileContent = new TextDecoder('utf-8').decode(bytes);
    const { data, content } = parseFrontmatter(fileContent);

    return {
      slug,
      title: data.title || 'Untitled',
      excerpt: data.excerpt || '',
      date: data.date || new Date().toISOString(),
      tags: Array.isArray(data.tags)
        ? data.tags
        : typeof data.tags === 'string'
          ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
          : [],
      content,
    };

  } catch (error) {
    console.error(`Error fetching post ${slug}:`, error);
    return null;
  }
};
