# Fiverr MCP Server

This project registers the [`fiverr-mcp-server`](https://github.com/KyuRish/fiverr-mcp-server)
Model Context Protocol (MCP) server so Claude can search and browse Fiverr —
gigs, sellers, pricing, and reviews — directly from the assistant. No Fiverr API
key is required; it reads public pages.

> **Two servers, two jobs.** This page documents the **read-only public**
> scraper (`fiverr` in `.mcp.json`). For **authenticated automation of your own
> account** — reading your inbox, sending offers, managing gigs/orders — see the
> separate **Fiverr Agent MCP** in [`../fiverr-agent-mcp/`](../fiverr-agent-mcp/README.md),
> registered as `fiverr-agent`. It drives a logged-in Playwright browser session
> and requires your credentials + setup (see its
> [installation guide](../fiverr-agent-mcp/docs/installation.md)).

## How it is wired

The server is declared in [`.mcp.json`](../.mcp.json) at the repository root.
Claude Code (and other MCP clients that read a project `.mcp.json`) picks it up
automatically when the project is opened.

```json
{
  "mcpServers": {
    "fiverr": {
      "command": "uvx",
      "args": [
        "--from", "fiverr-mcp-server==0.1.1",
        "--with", "mcp[cli]>=1.0.0,<2",
        "fiverr-mcp-server"
      ],
      "env": {
        "TRANSPORT": "stdio",
        "RATE_LIMIT_DELAY": "2"
      }
    }
  }
}
```

`uvx` fetches the pinned package into an isolated, cached environment on first
run, so **nothing needs to be committed to the repo** and there is no shared
virtual environment to maintain.

### Why the `mcp` version is pinned

`fiverr-mcp-server==0.1.1` depends on `mcp[cli]>=1.0.0` with no upper bound. The
`mcp` 2.0 release removed `mcp.server.fastmcp`, which this package imports, so an
unpinned install resolves to `mcp==2.x` and the server fails to start with:

```
ModuleNotFoundError: No module named 'mcp.server.fastmcp'
```

The `--with "mcp[cli]>=1.0.0,<2"` constraint forces a compatible 1.x release
(currently `mcp==1.29.0`). Keep this pin until upstream adds 2.x support.

## Prerequisites

- [`uv`](https://docs.astral.sh/uv/) (provides `uvx`). Install with:

  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```

That is the only requirement — `uvx` manages Python and all package
dependencies in its own cache.

## Recreating / testing locally

Run the server the same way the MCP client does (it speaks stdio, so it blocks
waiting for a client — `Ctrl-C` to stop):

```bash
uvx --from "fiverr-mcp-server==0.1.1" --with "mcp[cli]>=1.0.0,<2" fiverr-mcp-server
```

Smoke-test that the tools register without starting a full session:

```bash
uvx --from "fiverr-mcp-server==0.1.1" --with "mcp[cli]>=1.0.0,<2" \
  python -c "import fiverr_mcp_server.tools; from fiverr_mcp_server.mcp_server import mcp; import asyncio; print([t.name for t in asyncio.run(mcp.list_tools())])"
```

Expected output:

```
['search_gigs', 'get_gig_details', 'get_seller_profile', 'get_gig_reviews', 'list_categories']
```

### Alternative: a local virtual environment

If you prefer a plain `pip` install instead of `uvx`, use an isolated venv so you
do not clobber system packages, and apply the same `mcp` pin:

```bash
python -m venv .venv-fiverr
.venv-fiverr/bin/pip install "fiverr-mcp-server==0.1.1" "mcp[cli]>=1.0.0,<2"
.venv-fiverr/bin/fiverr-mcp-server
```

`.venv-fiverr/` is git-ignored — do not commit it.

## Configuration

Set via the `env` block in `.mcp.json`, or as environment variables:

| Variable           | Description                          | Default  |
| ------------------ | ------------------------------------ | -------- |
| `TRANSPORT`        | Transport mode (`stdio` or `sse`)    | `stdio`  |
| `PROXY_URL`        | Optional HTTP proxy for requests     | –        |
| `RATE_LIMIT_DELAY` | Minimum seconds between requests      | `2`      |

## Available tools

| Tool                 | Purpose                                                        |
| -------------------- | ------------------------------------------------------------- |
| `search_gigs`        | Search the marketplace by keyword with filters and sorting.   |
| `get_gig_details`    | Full gig details including Basic/Standard/Premium pricing.     |
| `get_seller_profile` | Seller bio, languages, certifications, hourly rate, listings.  |
| `get_gig_reviews`    | First page of reviews for a gig.                              |
| `list_categories`    | Valid Fiverr category slugs for `search_gigs`.                |

## Responsible use

Data is scraped from Fiverr's public pages in real time. Keep the default rate
limit, avoid mass harvesting, and be aware that scraping may conflict with
Fiverr's Terms of Service.
