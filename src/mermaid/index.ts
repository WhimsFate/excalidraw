import type { ElementNode, Node } from "svg-parser";
import { parseSVG } from "svg-path-parser";
import { newElement, newLinearElement, newTextElement } from "../element";
import { parseNumber } from "./utils";
import mermaid from "mermaid";
import { parse } from "svg-parser";

export function travel(root: Node | string, deltaX = 0, deltaY = 0): any {
  if (typeof root === "string") {
    return;
  }
  if (root.type === "text") {
    return;
  }
  // arrow
  if (root.tagName === "defs") {
    return;
  }
  if (root.tagName === "text") {
    const x = parseNumber(root.properties?.x);
    const y = parseNumber(root.properties?.y);
    return travalForgeinNode(root, deltaX + x, deltaY + y, {
      width: 0,
      height: 0,
    });
  }
  if (root.tagName === "foreignObject") {
    const width = parseNumber(root.properties?.width);
    const height = parseNumber(root.properties?.height);
    return travalForgeinNode(root, deltaX, deltaY, { width, height });
  }

  if (root.tagName === "path") {
    return parsePath(root, deltaX, deltaY);
  }

  if (root.tagName === "rect") {
    return parseRect(root, deltaX, deltaY);
  }

  if (root.tagName === "polygon") {
    return parsePolygon(root, deltaX, deltaY);
  }

  if (root.tagName === "line") {
    const line = parseLine(root, deltaX, deltaY);
    return line;
  }

  if (root.tagName === "circle") {
    return parseCircle(root, deltaX, deltaY);
  }

  if (root.tagName === "g") {
    const transform = root.properties?.transform?.toString();
    if (transform) {
      const match = transform.match(/translate\((.*),(.*)\)/);
      if (match) {
        // TODO: parseText
        return root.children
          .map((child) =>
            travel(
              child,
              deltaX + parseNumber(match[1]),
              deltaY + parseNumber(match[2]),
            ),
          )
          .filter((i) => i)
          .flat();
      }
    }
  }
  return root.children
    .map((child) => travel(child, deltaX, deltaY))
    .filter((i) => i)
    .flat();
}

function parsePath(node: ElementNode, deltaX: number, deltaY: number) {
  if (node.properties?.class !== "arrowheadPath") {
    // return {
    //     type: 'path',
    //     d: node.properties?.['d'],
    //     end: !!node.properties?.['marker-end'],
    // }
    type AllowCommand = {
      x: number;
      y: number;
    };
    // @ts-ignore type
    const paths: AllowCommand[] = parseSVG(
      node.properties?.d?.toString() ?? "",
    ).filter((i) => {
      return (
        i.command !== "closepath" &&
        i.command !== "horizontal lineto" &&
        i.command !== "vertical lineto"
      );
    });
    if (!paths.length) {
      return;
    }

    const x = paths[0].x;
    const y = paths[0].y;
    let maxX = x;
    let maxY = y;
    let minX = x;
    let minY = y;
    const nodePaths: readonly [number, number][] = paths
      .map((p) => {
        const res: [number, number] = [p.x, p.y];
        if (res[0] < minX) {
          minX = res[0];
        } else if (res[0] > maxX) {
          maxX = res[0];
        }
        if (res[1] < minY) {
          minY = res[1];
        } else if (res[1] > maxY) {
          maxY = res[1];
        }
        return res;
      })
      .map(([a, b]) => [a - minX, b - minY]);
    return newLinearElement({
      type: "arrow",
      x: minX + deltaX,
      y: minY + deltaX,
      width: maxX - minX,
      height: maxY - minY,
      angle: 0,
      strokeColor: "#000000",
      backgroundColor: "transparent",
      fillStyle: "hachure",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      strokeSharpness: "round",
      points: nodePaths,
      startArrowhead: null,
      endArrowhead: node.properties?.["marker-end"] ? "arrow" : null,
    });
  }
}

function parseLine(node: ElementNode, deltaX: number, deltaY: number) {
  if (node.properties?.class !== "arrowheadPath") {
    // return {
    //     type: 'path',
    //     d: node.properties?.['d'],
    //     end: !!node.properties?.['marker-end'],
    // }
    const x1 = parseNumber(node.properties?.x1);
    const x2 = parseNumber(node.properties?.x2);
    const y1 = parseNumber(node.properties?.y1);
    const y2 = parseNumber(node.properties?.y2);
    return newLinearElement({
      type: "arrow",
      x: Math.min(x1, x2) + deltaX,
      y: Math.min(y1, y2) + deltaX,
      width: Math.abs(x1 - x2),
      height: Math.abs(y1 - y2),
      angle: 0,
      strokeColor: "#000000",
      backgroundColor: "transparent",
      fillStyle: "hachure",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      strokeSharpness: "round",
      points: [
        [0, 0],
        [Math.abs(x1 - x2), Math.abs(y1 - y2)],
      ],
      startArrowhead: null,
      endArrowhead: node.properties?.["marker-end"] ? "arrow" : null,
    });
  }
}

function parseRect(node: ElementNode, x: number, y: number) {
  const width: number = parseNumber(node.properties?.width);
  const height: number = parseNumber(node.properties?.height);
  return newElement({
    type: "rectangle",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    angle: 0,
    x: x + parseNumber(node.properties?.x),
    y: y + parseNumber(node.properties?.y),
    height,
    width,
    strokeColor: "#000000",
    backgroundColor: "pink",
    strokeSharpness: "round",
  });
}

function parsePolygon(node: ElementNode, x: number, y: number) {
  let x0 = 0;
  let x1 = 0;
  let y0 = 0;
  let y1 = 0;
  (node.properties!.points as string).split(" ").forEach((s) => {
    const [x, y] = s.split(",").map((i) => parseFloat(i));
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  });
  const height = y1 - y0;
  const width = x1 - x0;
  return newElement({
    type: "diamond",
    x: x0 + x - width / 2,
    y: y0 + y + height / 2,
    width,
    height,
    angle: 0,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    strokeSharpness: "sharp",
  });
}

mermaid.initialize({ securityLevel: "loose" });
const demoStr = `gitGraph:
options
{
    "nodeSpacing": 150,
    "nodeRadius": 10
}
end
commit
branch newbranch
checkout newbranch
commit
commit
checkout master
commit
commit
merge newbranch

            `;
export function handleSubmit(callback: (s: any[]) => void) {
  mermaid.initialize({ securityLevel: "loose" });
  mermaid.render("svg", demoStr, (svg) => {
    const root = parse(svg);
    const res = travel(root.children[0]);
    callback(res);
  });
}

function travalForgeinNode(
  node: Node | string,
  deltaX: number,
  deltaY: number,
  { height, width }: { height: number; width: number },
): any {
  if (typeof node === undefined) {
    return;
  }

  if (typeof node === "string" || node.type === "text") {
    return newTextElement({
      text: typeof node === "string" ? node : (node.value as string),
      fontFamily: 1,
      fontSize: 16,
      width,
      height,
      x: deltaX + width / 2,
      y: deltaY + height / 2,
      textAlign: "center",
      verticalAlign: "middle",
      strokeColor: "#000000",
      backgroundColor: "transparent",
      fillStyle: "hachure",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      strokeSharpness: "round",
    });
  }
  return node.children
    .map((child) => travalForgeinNode(child, deltaX, deltaY, { height, width }))
    .filter((i) => i)
    .flat();
}

function parseCircle(node: ElementNode, x: number, y: number) {
  const r: number = parseNumber(node.properties?.r);
  return newElement({
    type: "ellipse",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    angle: 0,
    x: x - r / 2,
    y: y - r / 2,
    height: r,
    width: r,
    strokeColor: "#000000",
    backgroundColor: "yellow",
    strokeSharpness: "round",
  });
}
