import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { defaultArchiveName, renderFormula } from "./gen-brew-formula.ts";

const SUMS = {
  "mrw_darwin_amd64.tar.gz": "a".repeat(64),
  "mrw_darwin_arm64.tar.gz": "b".repeat(64),
  "mrw_linux_amd64.tar.gz": "c".repeat(64),
  "mrw_linux_arm64.tar.gz": "d".repeat(64),
};

const base = {
  repo: "atvirokodosprendimai/tool-multipathreadwrite",
  tag: "v1.75.0",
  binary: "mrw",
  description: "Multi-path read and write",
  checksums: SUMS,
};

Deno.test("archive names follow mrw's release convention (no version in the name)", () => {
  assertEquals(
    defaultArchiveName({ goos: "darwin", goarch: "arm64" }, "mrw"),
    "mrw_darwin_arm64.tar.gz",
  );
});

Deno.test("formula renders per-OS/arch pairs from SHA256SUMS", () => {
  const f = renderFormula(base);
  // every target's archive URL and checksum is present
  for (const [an, sha] of Object.entries(SUMS)) {
    const asset = an.replace(".tar.gz", "");
    assert(f.includes(`/${an}"`) || f.includes(`${an}`), `archive ${an} missing`);
    assert(f.includes(sha), `sha for ${an} missing`);
  }
  // version strip, homepage, license, class name
  assert(f.includes('version "1.75.0"'));
  assert(f.includes('homepage "https://github.com/atvirokodosprendimai/tool-multipathreadwrite"'));
  assert(f.includes("class Mrw < Formula"));
  assert(f.includes('license "MIT"'));
  // GoReleaser house shape: on_macos/on_linux split with CPU guards, install, version test
  assert(f.includes("on_macos do"));
  assert(f.includes("Hardware::CPU.intel?"));
  assert(f.includes("Hardware::CPU.is_64_bit?"));
  assert(f.includes('bin.install "mrw"'));
  assert(f.includes('system "#{bin}/mrw", "version"'));
  assert(f.includes("DO NOT EDIT"));
});

Deno.test("missing checksum is a loud failure, not a placeholder", () => {
  assertThrows(
    () =>
      renderFormula({ ...base, checksums: { "mrw_darwin_arm64.tar.gz": "b".repeat(64) } }),
    Error,
    "missing checksum",
  );
});

Deno.test("installExtra lines land inside every install block", () => {
  const f = renderFormula({ ...base, installExtra: [`(etc/"mrw").mkpath`] });
  assertEquals(f.split(`(etc/"mrw").mkpath`).length - 1, 4);
});

Deno.test("test block override works", () => {
  const f = renderFormula({ ...base, testBlock: [`system "#{bin}/mrw", "--help"`] });
  assert(f.includes('"--help"'));
});

function assert(cond: boolean, msg = "assertion failed") {
  if (!cond) throw new Error(msg);
}
