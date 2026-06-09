export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.DATABASE_ID;

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 100 })
    });

    const data = await response.json();

    const items = (data.results || []).map(page => {
      const props = page.properties || {};
      const titleKey = Object.keys(props).find(k => props[k].type === 'title') || 'Name';

      const getTitle = (p) => p?.title?.[0]?.plain_text || '';
      const getDate = (p) => {
        const d = p?.date?.start;
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      };

      return {
        id: page.id,
        title: getTitle(props[titleKey]),
        status: props['Select']?.select?.name || '',
        type: (props['Tags']?.multi_select || []).map(t => t.name).join(', '),
        date: getDate(props['Date']),
        description: '',
        images: [],
        url: page.url
      };
    });

    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
