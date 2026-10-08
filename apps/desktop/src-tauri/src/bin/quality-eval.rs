#[tokio::main]
async fn main() {
    let args: Vec<_> = std::env::args_os().skip(1).collect();
    if args.len() == 3 && args[0] == "--capabilities" {
        println!(
            "{}",
            parrot_lib::quality_eval::capabilities(&args[1].to_string_lossy(), args[2].as_ref())
        );
        return;
    }
    if args.len() != 2 {
        eprintln!("Usage: parrot-quality-eval REQUEST.json OUTPUT.jsonl");
        std::process::exit(2);
    }
    if let Err(error) = parrot_lib::quality_eval::run(args[0].as_ref(), args[1].as_ref()).await {
        eprintln!("Quality evaluation failed: {error:#}");
        std::process::exit(1);
    }
}
