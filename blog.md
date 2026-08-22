---
layout: page
title: Blog
permalink: /blog/
---

<div class="page-prompt" aria-hidden="true">
  <span class="prompt">bhanuharya@sec</span><span class="loc">:~/blog$</span> <span class="cmd">ls -la</span>
</div>

<p class="page-lead dim">notes and experiments on security, systems, and self hosting.</p>

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
  <div class="tag-filter-bar" aria-label="Filter posts by tag">
    <span class="tag-filter-label dim">filter:</span>
    <button type="button" class="tag-btn is-active" data-tag="all" aria-pressed="true">all</button>
    {% for tag in all_tags %}
      <button type="button" class="tag-btn" data-tag="{{ tag }}" aria-pressed="false">{{ tag }}</button>
    {% endfor %}
  </div>
  {% endif %}

<ul class="post-list">
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
  var buttons = document.querySelectorAll('.tag-btn');
  var items = document.querySelectorAll('.post-list > li');
  var emptyMsg = document.querySelector('.tag-empty-msg');
  if (!buttons.length || !items.length) return;

  function filterTag(selectedTag) {
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
    buttons.forEach(function(btn) {
      var isActive = btn.getAttribute('data-tag') === selectedTag;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tag = btn.getAttribute('data-tag');
      filterTag(tag);
      if (history.replaceState) {
        history.replaceState(null, '', tag === 'all' ? window.location.pathname : '#' + encodeURIComponent(tag));
      }
    });
  });

  var hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  if (hash) {
    var matchBtn = Array.prototype.find.call(buttons, function(b) { return b.getAttribute('data-tag') === hash; });
    if (matchBtn) filterTag(hash);
  }
})();
</script>
{% else %}
<p class="dim" style="margin-top:1rem">no posts yet. check back soon :-)</p>
{% endif %}