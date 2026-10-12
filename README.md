# Mermaid Studio

A live Mermaid editor with a 20% source panel and an 80% diagram canvas.

Run from this directory:

```sh
python3 server.py
```

Open http://localhost:3900. To choose another port, use `python3 server.py --port 3901`.

No package installation is required. Python 3 serves the frontend; the browser loads pinned Mermaid 11.12.0 from jsDelivr, so an internet connection is required. Diagram rendering and source storage happen in your browser. Source is saved automatically in browser local storage.

- Edit or paste Mermaid syntax to update the preview automatically.
- Scroll your mouse wheel or touchpad, or pinch your touchpad, to zoom around the cursor.
- Drag the canvas to pan; touch screens also support pinch zoom.
- Use the + / − buttons, Fit, or double-click to fit the diagram.
- With the canvas focused, + / − zoom and 0 fits.
- Export the last valid diagram as SVG.
- Syntax errors preserve the last valid preview.

The supplied flowchart loads on first use. Flowcharts, sequence diagrams, class diagrams, and other Mermaid diagram types are supported. Large diagrams allow up to 200,000 source characters and 3,000 edges.
