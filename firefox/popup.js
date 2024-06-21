document.getElementById('changeColor').addEventListener('click', () => {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    browser.tabs.executeScript(tabs[0].id, {
      code: 'document.body.style.backgroundColor = "lightblue";'
    });
  });
});
