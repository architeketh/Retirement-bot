from flask import Flask, render_template
import feedparser

app = Flask(__name__)

RSS_FEEDS = [
    'https://www.marketwatch.com/rss/personal-finance',
    'https://www.forbes.com/retirement/feed/',
    'https://feeds.feedburner.com/TheSeniorList'
]

RESOURCES = {
    "Social Security": [
        {"name": "Official SSA", "url": "https://www.ssa.gov/"},
        {"name": "Benefits Planner", "url": "https://www.ssa.gov/benefits/retirement/"},
    ],
    "Finances": [
        {"name": "AARP Retirement", "url": "https://www.aarp.org/retirement/"},
        {"name": "Investopedia Retirement", "url": "https://www.investopedia.com/retirement-4427764"},
    ],
    "Travel": [
        {"name": "Senior Travel Tips", "url": "https://www.seniortravelhub.com/"},
    ],
    "Lifestyle": [
        {"name": "Senior Living", "url": "https://www.theseniorlist.com/lifestyle/"},
    ],
    "Insurance": [
        {"name": "Medicare.gov", "url": "https://www.medicare.gov/"},
    ],
}

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/articles')
def articles():
    entries = []
    for feed_url in RSS_FEEDS:
        feed = feedparser.parse(feed_url)
        for entry in feed.entries[:5]:
            entries.append({
                'title': entry.title,
                'link': entry.link,
                'summary': entry.get('summary', ''),
                'source': feed.feed.get('title', 'Unknown Source')
            })
    return render_template('articles.html', articles=entries)

@app.route('/resources')
def resources():
    return render_template('resources.html', resources=RESOURCES)

if __name__ == '__main__':
    app.run(debug=True)