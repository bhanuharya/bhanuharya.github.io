---
layout: page
title: Blog
permalink: /blog/
---

{% if site.posts.size > 0 %}
<ul class="post-list">
  {% for post in site.posts %}
    <li>
      <article class="post-card">
        <h2 class="post-card-title"><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h2>
        <time class="post-date" datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%b %-d, %Y' }}</time>
        {% if site.show_excerpts %}<div class="post-card-excerpt">{{ post.excerpt }}</div>{% endif %}
      </article>
    </li>
  {% endfor %}
</ul>
{% else %}
<p class="dim" style="margin-top:1rem">No posts yet — check back soon.</p>
{% endif %}
