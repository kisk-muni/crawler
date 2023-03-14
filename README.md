# crawler

Crawler browses the portfolio website acting as user and stores the scraped data to the database for the research purposes.

## Accessing scraped data

Crawler stores data to `portfolio_pages` table in our Supabase Postgres database.

| column       | description                                 |
| ------------ | ------------------------------------------- |
| url          | crawled url used as unique key              |
| data         | scraped data in jsonb                       |
| created_at   | timestamp of first creation                 |
| portfolio_id | uuid of the portfolio                       |
| updated_at   | timestamp of last update (last crawl ended) |

### scraped data structure

The scraped data are stored in jsonb format, which is a json data type
optimized for storing and querying data in json format.
The data structure is low-key defined bellow.

```
type Data = {
  "wordpress-pagetypes": string[];                         // e.g. ['single', 'home', 'archive', 'page'], refer to https://github.com/WordPress/wordpress-develop/blob/d088e31c73456179502c9bd5354fc43c6267bd7a/src/wp-includes/post-template.php#L608
  "post-content": PostContent | undefined;
  title: string | null;
  description: string | null;
  keywords: string[];
  og: Dictionary<OpenGraphResult>;
}

type PostContent = {
  text: string | null;
  aggregate: PostContentAggregate;
  tree: CustomElement | null;
}

type PostContentAggregate = {
  charactersCount: number | null;
  wordsCount: number | null;
  links: string[];
  tagsCount: { [key: string]: number };                     // e.g. { p: 6, h1: 1, h2: 3, a: 1}
  images: string[];
  iframes: string[];
};

type CustomElement = {
  tagName?: string | undefined;                             // e.g. 'p', 'h1', 'img', 'a'
  type?: 'tag' | 'text' | 'script' | 'style' | undefined;
  text?: string | undefined;                                // e.g. 'Hello World'
  attribs: {                                                // e.g. { src: 'https://example.com/image.jpg', alt: 'example image' }
      [key: string]: string;
  };
  children?: CustomElement[] | undefined;
}

```

### querying the data

Crawled data are stored as jsonb type in the postgres database.
There is variety of [build-in functions and operators](https://www.postgresql.org/docs/9.4/functions-json.html) to query the json or even index its parameters.

#### examples

get all pages with successfully parsed post-content (the where clause excludes pages such as 404, search, archive, tag etc.)

```sql
select * from portfolio_pages where (data->>'wordpress-pagetypes')::jsonb ?|	array['single', 'page'] and json_typeof(data->'post-content') != 'null' and json_typeof(data->'post-content'->'tree') != 'null';
```

get the plaintext of scraped posts

```sql
select data->'post-content'->'text' from portfolio_pages where (data->>'wordpress-pagetypes')::jsonb ?|	array['single', 'page'] and json_typeof(data->'post-content') != 'null' and json_typeof(data->'post-content'->'tree') != 'null';
```

get the title, description and open graph image of scraped posts

```sql
select data->>'title', data->>'description', data->og->image->>'imageValue' from portfolio_pages where (data->>'wordpress-pagetypes')::jsonb ?|	array['single', 'page'] and json_typeof(data->'post-content') != 'null' and json_typeof(data->'post-content'->'tree') != 'null';
```
