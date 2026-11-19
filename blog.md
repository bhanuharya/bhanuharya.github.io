---
layout: page
title: Entity Index
permalink: /blog/
kicker: "> ls /entities --all"
sigil: entity-index
lead: Things I've built, tested, and had to fix, mostly in security and self-hosting.
bare: true
description: Notes on security engineering, software tools, local models, and systems tested in practice.
---

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
  <div class="filter-bar">
    <label for="tag-filter">--tag</label>
    <select class="filter-select" id="tag-filter" aria-controls="post-list">
      <option value="all">all</option>
      {% for tag in all_tags %}
        <option value="{{ tag | escape }}">{{ tag | escape }}</option>
      {% endfor %}
    </select>
    <span class="filter-count" id="filter-status" role="status" aria-live="polite">{{ site.posts.size }} entities bound</span>
  </div>
  {% endif %}

<ul class="entity-list" id="post-list">
  {% for post in site.posts %}
    {% assign n = site.posts.size | minus: forloop.index0 %}
    <li data-tags="{{ post.tags | join: ',' }}" class="panel">{% include entity.html post=post n=n new=forloop.first level=2 %}</li>
  {% endfor %}
</ul>
<p class="empty-msg" hidden>ERROR: no entity bound to that tag.</p>

<script>
(function() {
  var select = document.getElementById('tag-filter');
  var items = document.querySelectorAll('#post-list > li');
  var emptyMsg = document.querySelector('.empty-msg');
  var status = document.getElementById('filter-status');
  if (!select || !items.length) return;

  function filterTag(selectedTag) {
    var visibleCount = 0;
    items.forEach(function(item) {
      var itemTags = (item.getAttribute('data-tags') || '').split(',');
      var show = selectedTag === 'all' || itemTags.indexOf(selectedTag) !== -1;
      item.hidden = !show;
      if (show) visibleCount++;
    });
    if (emptyMsg) emptyMsg.hidden = (visibleCount > 0);
    if (status) {
      status.textContent = selectedTag === 'all'
        ? visibleCount + (visibleCount === 1 ? ' entity' : ' entities') + ' bound'
        : visibleCount + (visibleCount === 1 ? ' entity' : ' entities') + ' tagged #' + selectedTag;
    }
  }

  select.addEventListener('change', function() {
    var tag = select.value;
    filterTag(tag);
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
      filterTag(hash);
    }
  }
})();
</script>
{% else %}
<div class="panel"><p class="crt" style="margin:0">No entities bound yet. Check back soon :-)</p></div>
{% endif %}
