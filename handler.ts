function respond(statusCode: number, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    isBase64Encoded: false,
    body: JSON.stringify(body, null, 2),
  };
}

export async function hello(event, context) {
  console.log("hello");
  const response = { message: "Your function executed successfully!" };
  return respond(200, response);
}
