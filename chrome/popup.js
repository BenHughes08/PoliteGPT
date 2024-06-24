document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('changeColor').addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: function() {
          document.body.style.backgroundColor = 'lightblue';
        }
      });
    });
  });
});
