---
layout: page
title: Blog
permalink: /blog/
---

<p class="page-lead dim">notes and experiments on security, systems, and self-hosting.</p>

{% if site.posts.size > 0 %}
<ul class="post-list">
  {% for post in site.posts %}
    <li>
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
{% else %}
<p class="dim" style="margin-top:1rem">no posts yet — check back soon :-)</p>
{% endif %}
