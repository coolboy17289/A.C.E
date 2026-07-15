/*
 * A.C.E OS · C + GTK4 + libsoup3 front-end MVP.
 *
 * Layout: one GtkApplicationWindow with two GtkLabel data rows and a
 * GtkButton. Pressing the button (or first-render) fires two async
 * SOUP requests — /api/health and /api/users/me — and updates the
 * labels inside `g_idle_add`, which guarantees the UI work runs on
 * the GTK main thread even though SoupSession invokes the callbacks
 * off-thread.
 *
 * Why libsoup3 (and not libcurl):
 *   libsoup3 integrates with GLib's MainContext, so async callbacks
 *   route through the same event loop that pumps GTK events. If we
 *   used libcurl we'd have to manage our own worker thread + a
 *   g_idle_add hop ourselves and there'd be a hard-to-test race
 *   window between the worker thread finishing and the UI seeing
 *   the new value. libsoup3 collapses all that into one priority
 *   queue.
 *
 * Why json-glib (and not cJSON):
 *   json-glib is the GLib-native parser and links against libsoup's
 *   GBytes API directly, so reading the response body is one
 *   `json_parser_load_from_data()` call rather than manual malloc.
 *   It's also already installed wherever GTK4 is.
 */

#include <gtk/gtk.h>
#include <libsoup/soup.h>
#include <json-glib/json-glib.h>

#define BACKEND_BASE "http://localhost:4318"

/*
 * Single-bag-of-stuff we pass as `gpointer` to libsoup callbacks so
 * each callback can find the labels it should rewrite. A struct is
 * the natural callback-context shape (no closures in C).
 */
/* `gatomic_int` would be a tat-pur-ports atomic but the click handler
 * is the SOLE writer to `pending` and `apply_idle` (which runs on the
 * main thread) is the sole decrementer. Cross-thread writes to
 * `pending` only happen in the Soup callbacks, and they do not touch
 * the counter — they just dispatch `apply_idle` via g_idle_add. */
typedef struct {
    GtkLabel    *backend_lbl;
    GtkLabel    *user_lbl;
    GtkLabel    *error_lbl;
    GtkButton   *refresh_btn;
    SoupSession *session;
    int          pending;
} UiCtx;

static void ui_set_error(UiCtx *ctx, const char *msg) {
    gtk_label_set_text(ctx->error_lbl, msg);
}

static void ui_finish(UiCtx *ctx) {
    ctx->pending--;
    if (ctx->pending <= 0) {
        gtk_button_set_label(ctx->refresh_btn, "Refresh");
        gtk_widget_set_sensitive(GTK_WIDGET(ctx->refresh_btn), TRUE);
        ctx->pending = 0;
    }
}

/* `idle_source` is GLib's cross-thread → main-thread bridge. */
typedef struct {
    UiCtx  *ctx;
    char   *backend_text;   /* owned string; "" = no change */
    char   *user_text;      /* owned string; "" = no change */
    char   *error_text;     /* owned string; NULL = no change */
} IdlePayload;

static gboolean apply_idle(gpointer user_data) {
    IdlePayload *p = user_data;
    if (p->backend_text) gtk_label_set_text(p->ctx->backend_lbl, p->backend_text);
    if (p->user_text)    gtk_label_set_text(p->ctx->user_lbl,    p->user_text);
    if (p->error_text)   gtk_label_set_text(p->ctx->error_lbl,   p->error_text);
    if (p->backend_text || p->user_text) {
        /* If we made any visible progress, clear the error row. */
        if (!p->error_text) gtk_label_set_text(p->ctx->error_lbl, "");
    }
    ui_finish(p->ctx);
    g_free(p->backend_text);
    g_free(p->user_text);
    g_free(p->error_text);
    g_free(p);
    return G_SOURCE_REMOVE;
}

static void dispatch_error(UiCtx *ctx, const char *msg) {
    IdlePayload *p = g_new0(IdlePayload, 1);
    p->ctx = ctx;
    p->error_text = g_strdup(msg);
    g_idle_add(apply_idle, p);
}

/*
 * libsoup3 callback. Runs off the UI thread; we therefore only emit
 * `apply_idle` payloads via `g_idle_add` and never touch widgets
 * directly. `g_input_stream_read_all_async` (SOUP) is consumed as
 * bytes; `json_parser_load_from_data` then turns it into JSON.
 */
static void on_message_done(GObject *source, GAsyncResult *res, gpointer user_data) {
    UiCtx      *ctx   = user_data;
    SoupSession *session = SOUP_SESSION(source);
    GError     *err   = NULL;
    SoupMessage *msg  = soup_session_send_and_read_finish(session, res, &err);

    if (err) {
        char *m = g_strdup_printf("Error: %s", err->message);
        dispatch_error(ctx, m);
        g_free(m);
        g_clear_error(&err);
        return;
    }
    if (!msg || msg->status_code >= 400) {
        dispatch_error(ctx, msg ? "HTTP error from backend" : "no response");
        if (msg) g_object_unref(msg);
        return;
    }

    GBytes *body = soup_message_get_response_body(msg);
    gsize len;
    const char *raw = g_bytes_get_data(body, &len);
    JsonParser *parser = json_parser_new();
    if (!json_parser_load_from_data(parser, raw, len, &err)) {
        dispatch_error(ctx, "Error: bad JSON");
        g_object_unref(msg);
        g_object_unref(parser);
        g_clear_error(&err);
        return;
    }

    JsonNode *root = json_parser_get_root(parser);
    if (!JSON_NODE_HOLDS_OBJECT(root)) {
        dispatch_error(ctx, "Error: JSON was not an object");
        g_object_unref(msg);
        g_object_unref(parser);
        return;
    }

    JsonObject *obj = json_node_get_object(root);
    IdlePayload *p = g_new0(IdlePayload, 1);
    p->ctx = ctx;

    const char *path = soup_message_get_uri(msg)->path;

    if (g_str_has_suffix(path, "/api/users/me")) {
        const char *name = json_object_get_string_member(obj, "name");
        p->user_text = g_strdup_printf("User: %s", name ? name : "(unnamed)");
    } else if (g_str_has_suffix(path, "/api/health")) {
        const char *service = json_object_get_string_member(obj, "service");
        gboolean ok = json_object_get_boolean_member(obj, "ok");
        p->backend_text = g_strdup_printf("Backend: %s (%s)",
                                          service ? service : "ace-backend",
                                          ok ? "ok" : "down");
    }

    g_idle_add(apply_idle, p);

    g_object_unref(msg);
    g_object_unref(parser);
}

static void fetch_one(UiCtx *ctx, const char *path) {
    char *url = g_strconcat(BACKEND_BASE, path, NULL);
    SoupMessage *msg = soup_message_new(SOUP_METHOD_GET, url);
    soup_session_send_and_read_async(ctx->session, msg,
                                     G_PRIORITY_DEFAULT, NULL,
                                     on_message_done, ctx);
    g_free(url);
    g_object_unref(msg);
}

static void on_refresh_clicked(GtkButton *btn, gpointer user_data) {
    (void)btn;
    UiCtx *ctx = user_data;
    /* Re-entrancy guard. Without this, clicking Refresh while a fetch
     * is in flight would set `pending = 2` again, clobber the in-flight
     * counter, and let the older callbacks decrement through zero and
     * re-enable the button mid-flight. */
    if (ctx->pending > 0) return;
    gtk_button_set_label(ctx->refresh_btn, "Refreshing...");
    gtk_widget_set_sensitive(GTK_WIDGET(ctx->refresh_btn), FALSE);
    gtk_label_set_text(ctx->error_lbl, "");
    ctx->pending = 2;
    fetch_one(ctx, "/api/health");
    fetch_one(ctx, "/api/users/me");
}

static void activate(GtkApplication *app, gpointer user_data) {
    (void)user_data;
    GtkWidget *win = gtk_application_window_new(app);
    gtk_window_set_title(GTK_WINDOW(win), "A.C.E OS - GTK");
    gtk_window_set_default_size(GTK_WINDOW(win), 640, 360);

    /* CSS to mimic the other shells — dark gradient + accent. We
     * embed the stylesheet inline so we don't need to ship a .css
     * file with the binary for the MVP. */
    GtkCssProvider *css = gtk_css_provider_new();
    const char *css_str =
        "window {"
        "  background: linear-gradient(135deg, #1f2a44 0%, #0b1020 100%);"
        "}"
        "label { color: #e8eaf3; }"
        "#ace-subtitle { color: #94a3b8; font-size: 11px; }"
        "#ace-user    { color: #60a5fa; font-weight: bold; }"
        "#ace-error   { color: #fca5a5; font-size: 11px; }"
        "#ace-title   { font-size: 26px; font-weight: 700; padding-bottom: 4px; }"
        "button {"
        "  background: linear-gradient(135deg, #60a5fa, #a78bfa);"
        "  color: white; border: none; border-radius: 10px;"
        "  padding: 8px 22px; font-weight: 600;"
        "}"
        "button:disabled { background: #475569; }";
    gtk_css_provider_load_from_string(css, css_str);
    gtk_style_context_add_provider_for_display(
        gdk_display_get_default(),
        GTK_STYLE_PROVIDER(css),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);

    GtkWidget *box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 10);
    gtk_widget_set_margin_start(box, 28);
    gtk_widget_set_margin_end(box, 28);
    gtk_widget_set_margin_top(box, 28);
    gtk_widget_set_margin_bottom(box, 28);

    GtkWidget *title = gtk_label_new("A.C.E OS");
    gtk_widget_set_name(title, "ace-title");

    GtkWidget *subtitle = gtk_label_new("C + GTK4 shell  -  v0.1.0");
    gtk_widget_set_name(subtitle, "ace-subtitle");

    GtkWidget *backend_lbl = gtk_label_new("Backend: -");
    GtkWidget *user_lbl    = gtk_label_new("User: -");
    gtk_widget_set_name(user_lbl, "ace-user");
    GtkWidget *error_lbl   = gtk_label_new("");
    gtk_widget_set_name(error_lbl, "ace-error");

    GtkWidget *btn = gtk_button_new_with_label("Refresh");

    gtk_box_append(GTK_BOX(box), title);
    gtk_box_append(GTK_BOX(box), subtitle);
    gtk_box_append(GTK_BOX(box), backend_lbl);
    gtk_box_append(GTK_BOX(box), user_lbl);
    gtk_box_append(GTK_BOX(box), error_lbl);
    gtk_box_append(GTK_BOX(box), btn);

    gtk_window_set_child(GTK_WINDOW(win), box);

    /* Allocate the per-window context BEFORE wiring the click handler.
     * `ctx` is captured as user_data; if it were NULL the click
     * callback would deref `ctx->pending` and segfault. */
    UiCtx *ctx = g_new0(UiCtx, 1);
    ctx->backend_lbl  = GTK_LABEL(backend_lbl);
    ctx->user_lbl     = GTK_LABEL(user_lbl);
    ctx->error_lbl    = GTK_LABEL(error_lbl);
    ctx->refresh_btn  = GTK_BUTTON(btn);
    ctx->session      = soup_session_new();
    g_object_set(ctx->session, "user-agent", "ace-c-gtk4/0.1.0", NULL);

    /* Single click handler. The same callback is also the idle-source
     * one-shot for the auto-fetch on first paint. */
    g_signal_connect(btn, "clicked", G_CALLBACK(on_refresh_clicked), ctx);
    g_idle_add_once((GSourceOnceFunc) on_refresh_clicked, ctx);

    /* Tear-down on window destroy. Order matters: unref the session
     * FIRST (while ctx is still alive) so we can read `ctx->session`
     * from inside G_CALLBACK(g_object_unref). g_free(ctx) runs second. */
    g_signal_connect_swapped(win, "destroy", G_CALLBACK(g_object_unref), ctx->session);
    g_signal_connect_swapped(win, "destroy", G_CALLBACK(g_free), ctx);

    gtk_window_present(GTK_WINDOW(win));
}

int main(int argc, char **argv) {
    GtkApplication *app = gtk_application_new("com.ace.gtk", G_APPLICATION_DEFAULT_FLAGS);
    g_signal_connect(app, "activate", G_CALLBACK(activate), NULL);
    int status = g_application_run(G_APPLICATION(app), argc, argv);
    g_object_unref(app);
    return status;
}
