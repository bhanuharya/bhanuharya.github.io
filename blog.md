---
layout: page
title: Blog
permalink: /blog/
description: Notes on security engineering, software tools, local models, and systems tested in practice.
---

<div class="page-prompt" aria-hidden="true">
  <span class="prompt">bhanuharya@sec</span><span class="loc">:~/blog$</span> <span class="cmd">ls -la</span>
</div>

<p class="page-lead dim">Things I've built, tested, and had to fix, mostly in security and self-hosting.</p>

{% if site.posts.size > 0 %}
  {% assign all_tags = "" | split: "" %}
  {% for post in site.posts %}
    {% for tag in post.tags %}
      {% unless all_tags contains tag %}
        {% assign all_tags = all_tags | push: tag %}
      {% endunless %}
    {% endfor %}
  {% endfor %}

  {% if all_tags.size > 0 %}
  <div class="tag-filter-bar">
    <label class="tag-filter-label dim" for="tag-filter">filter:</label>
    <select class="tag-filter-select" id="tag-filter" aria-controls="post-list">
      <option value="all">all topics</option>
      {% for tag in all_tags %}
        <option value="{{ tag | escape }}">{{ tag | escape }}</option>
      {% endfor %}
    </select>
    <span class="visually-hidden" id="filter-status" role="status" aria-live="polite"></span>
  </div>
  {% endif %}

<ul class="post-list" id="post-list">
  {% for post in site.posts %}
    <li data-tags="{{ post.tags | join: ',' }}">
      <article class="post-card">
        <h2 class="post-card-title"><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h2>
        <div class="post-meta">
          <time class="post-date" datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%b %-d, %Y' }}</time>
          {% assign words = post.content | number_of_words %}
          {% assign mins = words | divided_by: 200 %}
          {% if mins == 0 %}{% assign mins = 1 %}{% endif %}
          <span aria-hidden="true"> · </span><span class="post-reading">{{ mins }} min read</span>
        </div>
        {% if post.tags and post.tags.size > 0 %}
        <div class="post-tags post-tags--compact" aria-label="Tags">
          {% for tag in post.tags %}<span class="tag">{{ tag }}</span>{% endfor %}
        </div>
        {% endif %}
        {% if site.show_excerpts %}<div class="post-card-excerpt">{{ post.excerpt }}</div>{% endif %}
        <a class="post-card-cta" href="{{ post.url | relative_url }}">read →</a>
      </article>
    </li>
  {% endfor %}
</ul>
<p class="dim tag-empty-msg" hidden style="margin-top:1rem">no posts found for this tag.</p>

<script>
(function() {
  var select = document.querySelector('.tag-filter-select');
  var items = document.querySelectorAll('.post-list > li');
  var emptyMsg = document.querySelector('.tag-empty-msg');
  var status = document.getElementById('filter-status');
  if (!select || !items.length) return;

  function filterTag(selectedTag, announce) {
    var visibleCount = 0;
    items.forEach(function(item) {
      var itemTags = (item.getAttribute('data-tags') || '').split(',');
      if (selectedTag === 'all' || itemTags.indexOf(selectedTag) !== -1) {
        item.hidden = false;
        visibleCount++;
      } else {
        item.hidden = true;
      }
    });
    if (emptyMsg) emptyMsg.hidden = (visibleCount > 0);
    if (announce && status) {
      status.textContent = selectedTag === 'all'
        ? 'Showing all ' + visibleCount + (visibleCount === 1 ? ' post.' : ' posts.')
        : 'Showing ' + visibleCount + (visibleCount === 1 ? ' post tagged ' : ' posts tagged ') + selectedTag + '.';
    }
  }

  select.addEventListener('change', function() {
    var tag = select.value;
    filterTag(tag, true);
    if (history.replaceState) {
      var target = window.location.pathname + window.location.search;
      history.replaceState(null, '', tag === 'all' ? target : target + '#' + encodeURIComponent(tag));
    }
  });

  var hash = window.location.hash.replace(/^#/, '');
  try { hash = decodeURIComponent(hash); } catch (e) { hash = ''; }
  if (hash) {
    var hasTag = Array.prototype.some.call(select.options, function(option) {
      return option.value === hash;
    });
    if (hasTag) {
      select.value = hash;
      filterTag(hash, false);
    }
  }
})();
</script>
{% else %}
<p class="dim" style="margin-top:1rem">no posts yet. check back soon :-)</p>
{% endif %}