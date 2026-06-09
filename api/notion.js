export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.DATABASE_ID;

  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  };

  try {
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST', headers, body: JSON.stringify({ page_size: 100 })
    });
    const dbData = await dbRes.json();

    const items = await Promise.all((dbData.results || []).map(async page => {
      const props = page.properties || {};
      const titleKey = Object.keys(props).find(k => props[k].type === 'title') || 'Name';

      const getDate = (p) => {
        const d = p?.date?.start;
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      };

      const blocksRes = await fetch(`https://api.notion.com/v1/blocks/${page.id}/children`, { headers });
      const blocksData = await blocksRes.json();
      const embedUrl = (blocksData.results || []).find(b => b.type === 'embed')?.embed?.url || '';

      return {
        id: page.id,
        title: props[titleKey]?.title?.[0]?.plain_text || '',
        status: props['Select']?.select?.name || '',
        type: (props['Tags']?.multi_select || []).map(t => t.name).join(', '),
        date: getDate(props['Date']),
        dateRaw: props['Date']?.date?.start || '',
        embedUrl,
        url: page.url
      };
    }));

    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
