const ANON = /<([a-z]\w*-\w*)/gm;

function customElementTagNames(html = '') {
  return (html.match(ANON) || []).map((v) => v.slice(1));
}

export default customElementTagNames;
