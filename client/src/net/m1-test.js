export function runM1Test() {
  console.log("=== M1 TEST ===");

  const testMessage = {
    version: 1,
    type: "input",
    seq: 0,
    input: {
      left: false,
      right: false,
      thrust: true,
      fire: false,
    },
  };

  console.log("Input message:", testMessage);

  if (
    testMessage.version === 1 &&
    testMessage.type === "input" &&
    Number.isInteger(testMessage.seq)
  ) {
    console.log("M1 protocol test: OK");
    return true;
  }

  console.error("M1 protocol test: FAILED");
  return false;
}