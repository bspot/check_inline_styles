# Check Inline Style

This is a small internal tool; probably without value to anyone else.

- Fetch HTML documents from a list of URLs.
- Find all occurences of inline styles in these documents.
- Produce a report of these occurences.

Howto:

```
npm install
cp list_of_urls >urls.txt
node main.js fetch
```

Then open `report.html` in your browser.

To generate a new report without fetching:

```
  node main.js
```
