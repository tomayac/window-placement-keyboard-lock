let ROWS;
let COLS;
const WINDOW_CHROME_Y = 51;
const WINDOW_CHROME_X = 1;

let popups = [];
let numScreens = 0;

document.querySelectorAll("input").forEach(input => {
  const onInputChange = () => {
    input.dataset.value = input.value;
    if (input.id === "rows") {
      ROWS = parseInt(input.value, 10);
    } else {
      COLS = parseInt(input.value, 10);
    }
  };
  input.addEventListener("input", onInputChange);
  onInputChange();
});

const createPopup = (screenX, screenY, width, height) => {
  const features = [
    `left=${screenX}`,
    `top=${screenY}`,
    `width=${width}`,
    `height=${height}`,
    `menubar=no`,
    `toolbar=no`,
    `location=no`,
    `status=no`,
    `resizable=yes`,
    `scrollbars=no`
  ].join(",");
  return window.open("iframe.html", Math.random().toString(), features);
};

const isSupported = () => "getScreens" in window;

const getScreensInfo = async () => {
  if (isSupported()) {
    return await window.getScreens();
  }
  return [window.screen];
};

const onPopupClose = e => {
  e.preventDefault();
  popups.forEach(popup => {
    popup.removeEventListener("beforeunload", onPopupClose);
    popup.close();
  });
  popups = [];
};

const closeAllPopups = () => {
  if (popups.length) {
    popups[0].close();
  }
};

const onPopupClick = async e => {
  const body = e.target.closest("body");
  popups.forEach(popup => {
    if (e.view === popup) {
      return;
    }
    popup.document.exitFullscreen();
  });
  try {
    if (e.view.document.fullscreenElement) {
      return await e.view.document.exitFullscreen();
    }
    const screens = await getScreensInfo();
    let otherScreen = screens.filter(
      screen => screen.id !== e.view.screenId
    )[0];
    if (!otherScreen) {
      otherScreen = screens[0];
    }
    await body.requestFullscreen({
      screen: otherScreen
    });
  } catch (err) {
    console.error(err.name, err.message);
  }
};

const elmerify = async () => {
  if (window.self !== window.top) {
    window.open(location.href, '', 'noopener,noreferrer');
    return;
  }
  const screens = await getScreensInfo();
  popups = [];
  numScreens = screens.length;
  screens.forEach((screen, numScreen) => {
    screen.id = screen.id ? screen.id : numScreen;
    let width = Math.floor((screen.availWidth - COLS * WINDOW_CHROME_X) / COLS);
    let height = Math.floor(
      (screen.availHeight - ROWS * WINDOW_CHROME_Y) / ROWS
    );
    loop:
    for (let i = 0; i < COLS; i++) {
      for (let j = 0; j < ROWS; j++) {
        let screenX = i * width + screen.availLeft + i * WINDOW_CHROME_X;
        let screenY = j * height + screen.availTop + j * WINDOW_CHROME_Y;
        const popup = createPopup(screenX, screenY, width, height);
        if (!popup) {
          popups.forEach((popup) => popup.close());
          alert('It looks like you are blocking popup windows. Please allow them as outlined at https://goo.gle/allow-popups.');
          break loop;
        }
        popup.screenId = screen.id;
        popup.addEventListener("beforeunload", onPopupClose);
        popup.addEventListener("click", onPopupClick);
        popups.push(popup);
      }
    }
  });
};

const init = async () => {
  await fetch("iframe.html");

  document.querySelector("button").addEventListener("click", async () => {
    closeAllPopups();
    await elmerify();
  });
  window.addEventListener("screenschange", async () => {
    const changedScreens = await getScreensInfo();
    if (!popups.length || numScreens === changedScreens.length) {
      return;
    }
    closeAllPopups();
    await elmerify();
  });

  window.addEventListener("beforeunload", () => {
    closeAllPopups();
  });
};

init();
