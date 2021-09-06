import type { ElementNode, Node } from "svg-parser";
import { parseSVG } from "svg-path-parser";
import { newElement, newLinearElement } from "../element";
import { parseNumber } from "./utils";
import mermaid from "mermaid";
import { parse } from "svg-parser";

export function travel(root: Node | string): any {
  if (typeof root === "string") {
    return;
  }
  if (root.type === "text") {
    return;
  }

  if (root.tagName === "path") {
    return parsePath(root);
  }

  if (root.tagName === "g") {
    if (
      root.properties?.class &&
      root.properties.class.toString().split(" ").includes("node")
    ) {
      const transform = root.properties?.transform.toString();
      if (transform) {
        const match = transform.match(/translate\((.*),(.*)\)/);
        if (match) {
          // TODO: parseText
          return parseRect(root.children[0] as any, match[1], match[2]);
        }
      }
    }
  }
  return root.children
    .map(travel)
    .filter((i) => i)
    .flat();
}

function parsePath(node: ElementNode) {
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
      x: minX,
      y: minY,
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

function parseRect(node: ElementNode, x: string, y: string) {
  if (node.tagName === "rect") {
    const width: number = parseNumber(node.properties?.width);
    const height: number = parseNumber(node.properties?.height);
    return newElement({
      type: "rectangle",
      fillStyle: "hachure",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      angle: 0,
      x: parseFloat(x) - width / 2,
      y: parseFloat(y) - height / 2,
      height,
      width,
      strokeColor: "#000000",
      backgroundColor: "transparent",
      strokeSharpness: "round",
    });
  }

  if (node.tagName === "polygon") {
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
      x: x0 + parseFloat(x) - width / 2,
      y: y0 + parseFloat(y) + height / 2,
      width,
      height,
      angle: 0,
      strokeColor: "#000000",
      backgroundColor: "transparent",
      fillStyle: "hachure",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      strokeSharpness: "sharp",
    });
  }
}

mermaid.initialize({ securityLevel: "loose" });
const demoStr = `graph TD
A[Christmas] -->|Get money| B(Go shopping)
B --> C{Let me think}
C -->|One| D[Laptop]
C -->|Two| E[iPhone]
C -->|Three| F[fa:fa-car Car]`;
export function handleSubmit(callback: (s: any[]) => void) {
  mermaid.initialize({ securityLevel: "loose" });
  mermaid.render("svg", demoStr, (svg) => {
    const root = parse(svg);
    const res = travel(root.children[0]);
    callback(res);
  });
}
