let scoreElement = null;
let hpElement = null;
let stepsElement = null;
let fpsElement = null;
let frameTimeElement = null;

export function initHud(
  world,
  lobby = null,
  initialPlayers = []
) {


  const hud = document.createElement("div");

  hud.style.position = "fixed";
  hud.style.top = "15px";
  hud.style.left = "15px";
  hud.style.width = "160px";
  hud.style.padding = "10px 12px";

  hud.style.background =
    "rgba(10, 8, 30, 0.72)";

  hud.style.border =
    "1px solid rgba(180, 150, 255, 0.35)";

  hud.style.borderRadius = "10px";

  hud.style.backdropFilter =
    "blur(6px)";

  hud.style.webkitBackdropFilter =
    "blur(6px)";

  hud.style.color = "white";

  hud.style.font =
    "13px Arial, sans-serif";

  hud.style.lineHeight = "1.6";

  hud.style.zIndex = "9999";

  hud.style.boxSizing =
    "border-box";


  scoreElement =
    document.createElement("div");

  scoreElement.textContent =
    "Score: 0";


  hpElement =
    document.createElement("div");

  hpElement.textContent =
    "HP: 3";


  stepsElement =
    document.createElement("div");

  stepsElement.textContent =
    "Steps/s: 0";


  fpsElement =
    document.createElement("div");

  fpsElement.textContent =
    "FPS: 0";


  frameTimeElement =
    document.createElement("div");

  frameTimeElement.textContent =
    "Frame Time: 0.00 ms";


  hud.appendChild(
    scoreElement
  );

  hud.appendChild(
    hpElement
  );

  hud.appendChild(
    stepsElement
  );

  hud.appendChild(
    fpsElement
  );

  hud.appendChild(
    frameTimeElement
  );


  document.body.appendChild(
    hud
  );


  const sidebar =
    document.createElement("div");


  sidebar.style.position =
    "fixed";

  sidebar.style.top =
    "15px";

  sidebar.style.right =
    "15px";

  sidebar.style.width =
    "240px";

  // НЕ займає всю висоту гри
  sidebar.style.height =
    "430px";

  sidebar.style.maxHeight =
    "calc(100vh - 30px)";

  sidebar.style.boxSizing =
    "border-box";

  sidebar.style.display =
    "flex";

  sidebar.style.flexDirection =
    "column";

  sidebar.style.padding =
    "12px";



  sidebar.style.background =
    "rgba(10, 8, 30, 0.58)";


  sidebar.style.border =
    "1px solid rgba(180, 150, 255, 0.35)";


  sidebar.style.borderRadius =
    "12px";


  sidebar.style.backdropFilter =
    "blur(5px)";


  sidebar.style.webkitBackdropFilter =
    "blur(5px)";


  sidebar.style.color =
    "white";


  sidebar.style.fontFamily =
    "Arial, sans-serif";


  sidebar.style.zIndex =
    "9999";

  const playersTitle =
    document.createElement("div");


  playersTitle.textContent =
    "PLAYERS";


  playersTitle.style.fontSize =
    "11px";


  playersTitle.style.fontWeight =
    "700";


  playersTitle.style.letterSpacing =
    "1.5px";


  playersTitle.style.color =
    "#cfc5ff";


  playersTitle.style.marginBottom =
    "7px";


  sidebar.appendChild(
    playersTitle
  );


  const playersContainer =
    document.createElement("div");


  playersContainer.style.display =
    "flex";


  playersContainer.style.flexDirection =
    "column";


  playersContainer.style.gap =
    "5px";


  playersContainer.style.maxHeight =
    "100px";


  playersContainer.style.overflowY =
    "auto";


  playersContainer.style.minHeight =
    "25px";


  sidebar.appendChild(
    playersContainer
  );


  const separator =
    document.createElement("div");


  separator.style.height =
    "1px";


  separator.style.background =
    "rgba(255, 255, 255, 0.12)";


  separator.style.margin =
    "10px 0";


  sidebar.appendChild(
    separator
  );


  const chatTitle =
    document.createElement("div");


  chatTitle.textContent =
    "CHAT";


  chatTitle.style.fontSize =
    "11px";


  chatTitle.style.fontWeight =
    "700";


  chatTitle.style.letterSpacing =
    "1.5px";


  chatTitle.style.color =
    "#cfc5ff";


  chatTitle.style.marginBottom =
    "7px";


  sidebar.appendChild(
    chatTitle
  );


  const chatMessages =
    document.createElement("div");


  chatMessages.style.flex =
    "1";


  chatMessages.style.minHeight =
    "0";


  chatMessages.style.overflowY =
    "auto";


  chatMessages.style.display =
    "flex";


  chatMessages.style.flexDirection =
    "column";


  chatMessages.style.gap =
    "5px";


  chatMessages.style.paddingRight =
    "2px";


  sidebar.appendChild(
    chatMessages
  );


  const chatForm =
    document.createElement("form");


  chatForm.style.display =
    "flex";


  chatForm.style.gap =
    "5px";


  chatForm.style.marginTop =
    "8px";



  const chatInput =
    document.createElement("input");


  chatInput.type =
    "text";


  chatInput.placeholder =
    "Message...";


  chatInput.maxLength =
    500;


  chatInput.autocomplete =
    "off";


  chatInput.style.flex =
    "1";


  chatInput.style.minWidth =
    "0";


  chatInput.style.boxSizing =
    "border-box";


  chatInput.style.padding =
    "7px 8px";


  chatInput.style.border =
    "1px solid rgba(180, 150, 255, 0.30)";


  chatInput.style.borderRadius =
    "7px";


  chatInput.style.background =
    "rgba(255, 255, 255, 0.10)";


  chatInput.style.color =
    "white";


  chatInput.style.outline =
    "none";


  chatInput.style.fontSize =
    "12px";


  const sendButton =
    document.createElement("button");


  sendButton.type =
    "submit";


  sendButton.textContent =
    "Send";


  sendButton.style.padding =
    "7px 9px";


  sendButton.style.border =
    "none";


  sendButton.style.borderRadius =
    "7px";


  sendButton.style.background =
    "#8d6bd1";


  sendButton.style.color =
    "white";


  sendButton.style.cursor =
    "pointer";


  sendButton.style.fontWeight =
    "700";


  sendButton.style.fontSize =
    "12px";


  chatForm.appendChild(
    chatInput
  );


  chatForm.appendChild(
    sendButton
  );


  sidebar.appendChild(
    chatForm
  );


  document.body.appendChild(
    sidebar
  );


  function renderPlayers(players) {

    playersContainer.innerHTML =
      "";


    if (
      !Array.isArray(players) ||
      players.length === 0
    ) {

      const empty =
        document.createElement("div");


      empty.textContent =
        "No players";


      empty.style.color =
        "#91879e";


      empty.style.fontSize =
        "12px";


      playersContainer.appendChild(
        empty
      );


      return;
    }


    for (
      const player of players
    ) {

      const playerElement =
        document.createElement("div");


      playerElement.style.display =
        "flex";


      playerElement.style.alignItems =
        "center";


      playerElement.style.gap =
        "7px";


      playerElement.style.padding =
        "6px 7px";


      playerElement.style.background =
        "rgba(255, 255, 255, 0.06)";


      playerElement.style.borderRadius =
        "7px";



      const dot =
        document.createElement("span");


      dot.style.width =
        "7px";


      dot.style.height =
        "7px";


      dot.style.minWidth =
        "7px";


      dot.style.borderRadius =
        "50%";


      dot.style.background =
        "#9dffb0";


      dot.style.display =
        "inline-block";



      const name =
        document.createElement("span");


      let playerName =
        "Guest";


      if (
        typeof player === "string"
      ) {

        playerName =
          player;

      } else if (
        player &&
        player.name
      ) {

        playerName =
          player.name;

      }


      name.textContent =
        playerName;


      name.style.fontSize =
        "12px";


      playerElement.appendChild(
        dot
      );


      playerElement.appendChild(
        name
      );


      playersContainer.appendChild(
        playerElement
      );
    }
  }


  function addChatMessage(
    name,
    text
  ) {

    const message =
      document.createElement("div");


    message.style.padding =
      "6px 7px";


    message.style.background =
      "rgba(255, 255, 255, 0.05)";


    message.style.borderRadius =
      "7px";


    message.style.fontSize =
      "12px";


    message.style.lineHeight =
      "1.35";


    const nameElement =
      document.createElement("span");


    nameElement.textContent =
      `${name}: `;


    nameElement.style.fontWeight =
      "700";


    nameElement.style.color =
      "#cfc5ff";


    const textElement =
      document.createElement("span");


    textElement.textContent =
      text;


    message.appendChild(
      nameElement
    );


    message.appendChild(
      textElement
    );


    chatMessages.appendChild(
      message
    );


    chatMessages.scrollTop =
      chatMessages.scrollHeight;
  }


  renderPlayers(
    initialPlayers
  );


  function handleRoster(event) {

    const message =
      event.detail || {};


    const players =
      message.players || [];


    renderPlayers(
      players
    );
  }


  function handleChat(event) {

    const message =
      event.detail || {};


    addChatMessage(
      message.name || "Guest",
      message.text || ""
    );
  }


  if (
    lobby &&
    typeof lobby.addEventListener ===
      "function"
  ) {

    lobby.addEventListener(
      "roster",
      handleRoster
    );


    lobby.addEventListener(
      "chat",
      handleChat
    );
  }


  function handleChatSubmit(event) {

    event.preventDefault();


    const text =
      chatInput.value.trim();


    if (!text) {
      return;
    }


    if (
      lobby &&
      typeof lobby.sendChat ===
        "function"
    ) {

      lobby.sendChat(
        text
      );

    }


    chatInput.value =
      "";


    chatInput.focus();
  }


  chatForm.addEventListener(
    "submit",
    handleChatSubmit
  );


  function handleScoreChanged(
    event
  ) {

    if (
      scoreElement &&
      event.detail
    ) {

      scoreElement.textContent =
        `Score: ${event.detail.score}`;
    }
  }


  world.addEventListener(
    "scoreChanged",
    handleScoreChanged
  );


  return {

    update(ship, stats) {

      if (ship) {

        hpElement.textContent =
          `HP: ${ship.hp}`;

      } else {

        hpElement.textContent =
          "HP: 0";

      }


      stepsElement.textContent =
        `Steps/s: ${stats.stepsPerSecond}`;


      fpsElement.textContent =
        `FPS: ${stats.framesPerSecond}`;


      frameTimeElement.textContent =
        `Frame Time: ${stats.lastFrameDuration.toFixed(2)} ms`;
    },


    destroy() {

      if (
        lobby &&
        typeof lobby.removeEventListener ===
          "function"
      ) {

        lobby.removeEventListener(
          "roster",
          handleRoster
        );


        lobby.removeEventListener(
          "chat",
          handleChat
        );
      }


      world.removeEventListener(
        "scoreChanged",
        handleScoreChanged
      );


      hud.remove();


      sidebar.remove();


      scoreElement = null;
      hpElement = null;
      stepsElement = null;
      fpsElement = null;
      frameTimeElement = null;
    }

  };
}

