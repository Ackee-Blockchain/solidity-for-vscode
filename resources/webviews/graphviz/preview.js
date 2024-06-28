document.getElementById("scalePercent").onchange = (e) => setScale(e.target.value / 100.0);

const fitToWidthButton = document.getElementById("fitToWidth");
fitToWidthButton.onclick = fitToWidth;
fitToWidthButton.ondblclick = () => setFitToWidthMode(!fitToWidthToggledOn);

const fitToHeightButton = document.getElementById("fitToHeight");
fitToHeightButton.onclick = fitToHeight;
fitToHeightButton.ondblclick = () => setFitToHeightMode(!fitToHeightToggledOn);

document.getElementById("download").onclick = exportSvg;
document.getElementById("openInBrowser").onclick = openInBrowser;