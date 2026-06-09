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

      const getTitle = (p) => p?.title?.[0]?.plain_text || p?.rich_text?.[0]?.plain_text || '';
      const getSelect = (p) => p?.select?.name || '';
      const getMultiSelect = (p) => (p?.multi_select || []).map(s => s.name).join(', ');
      const getDate = (p) => {
        const d = p?.date?.start;
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };
      const getRichText = (p) => p?.rich_text?.[0]?.plain_text || '';
      const getFiles = (p) => (p?.files || []).map(f => f.file?.url || f.external?.url || '').filter(Boolean);

      const titleKey = Object.keys(props).find(k => props[k].type === 'title') || 'Name';
      const statusKey = Object.keys(props).find(k => k.toLowerCase().includes('status')) || '';
      const typeKey = Object.keys(props).find(k => k.toLowerCase().includes('type') || k.toLowerCase().includes('format')) || '';
      const dateKey = Object.keys(props).find(k => props[k].type === 'date') || '';
      const descKey = Object.keys(props).find(k => k.toLowerCase().includes('desc') || k.toLowerCase().includes('copy') || k.toLowerCase().includes('caption') || k.toLowerCase().includes('note')) || '';
      const imgKey = Object.keys(props).find(k => props[k].type === 'files') || '';

      return {
        id: page.id,
        title: getTitle(props[titleKey]),
        status: statusKey ? (getSelect(props[statusKey]) || getMultiSelect(props[statusKey])) : '',
        type: typeKey ? (getSelect(props[typeKey]) || getMultiSelect(props[typeKey])) : '',
        date: dateKey ? getDate(props[dateKey]) : '',
        description: descKey ? getRichText(props[descKey]) : '',
        images: imgKey ? getFiles(props[imgKey]) : [],
        url: page.url
      };
    });

    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
